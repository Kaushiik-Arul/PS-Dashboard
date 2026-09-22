[CmdletBinding()]
param(
    [string]$FunctionCsv = 'C:\Users\ARL4BAN\Documents\PS\OrgUnit Function Mapping.csv',
    [string]$RangeCsv = 'C:\Users\ARL4BAN\Documents\PS\OrgUnit - Range Mapping.csv',
    [string]$DatabaseUrl,
    [string]$PsqlPath = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

function Get-DatabaseUrl {
    if ($DatabaseUrl) {
        return $DatabaseUrl
    }

    $envPath = Join-Path $repoRoot 'apps\api\.env'
    if (-not (Test-Path -LiteralPath $envPath)) {
        throw "DATABASE_URL was not provided and $envPath does not exist."
    }

    $line = Get-Content -LiteralPath $envPath |
        Where-Object { $_ -match '^\s*DATABASE_URL=' } |
        Select-Object -First 1
    if (-not $line) {
        throw "DATABASE_URL is missing from $envPath."
    }

    return (($line -split '=', 2)[1]).Trim().Trim('"').Trim("'")
}

function Get-PsqlPath {
    if (Test-Path -LiteralPath $PsqlPath) {
        return $PsqlPath
    }

    $command = Get-Command psql -ErrorAction SilentlyContinue
    if ($command) {
        return $command.Source
    }

    throw 'psql was not found. Pass -PsqlPath with the PostgreSQL client path.'
}

function Normalize-Header([string]$Header) {
    return (($Header.Trim().ToLowerInvariant() -replace '[^a-z0-9]+', '_') -replace '^_+|_+$', '')
}

function Resolve-Header {
    param(
        [string[]]$Headers,
        [string[]]$Aliases,
        [string]$Label,
        [string]$CsvPath
    )

    $matches = @($Headers | Where-Object { $Aliases -contains (Normalize-Header $_) })
    if ($matches.Count -ne 1) {
        $found = $Headers -join ', '
        throw "$CsvPath must contain exactly one $Label column. Found headers: $found"
    }
    return $matches[0]
}

function Read-MappingCsv {
    param(
        [string]$CsvPath,
        [ValidateSet('range', 'function')]
        [string]$ValueType
    )

    if (-not (Test-Path -LiteralPath $CsvPath)) {
        throw "Mapping file does not exist: $CsvPath"
    }

    $rows = @(Import-Csv -LiteralPath $CsvPath)
    if ($rows.Count -eq 0) {
        throw "Mapping file has no data rows: $CsvPath"
    }

    $headers = @($rows[0].PSObject.Properties.Name)
    $orgHeader = Resolve-Header $headers @('organizational_unit', 'organisational_unit', 'org_unit', 'orgunit') 'Organizational Unit' $CsvPath
    $valueAliases = if ($ValueType -eq 'range') { @('range', 'range_value') } else { @('function', 'function_value') }
    $valueHeader = Resolve-Header $headers $valueAliases $ValueType $CsvPath
    $byOrgUnit = @{}

    foreach ($row in $rows) {
        $orgUnit = ([string]$row.PSObject.Properties[$orgHeader].Value).Trim()
        $mappedValue = ([string]$row.PSObject.Properties[$valueHeader].Value).Trim()
        if (-not $orgUnit -or -not $mappedValue) {
            throw "$CsvPath contains a blank Organizational Unit or $ValueType value."
        }

        $key = $orgUnit.ToLowerInvariant()
        if ($byOrgUnit.ContainsKey($key)) {
            $existing = [string]$byOrgUnit[$key].mapped_value
            if (-not $existing.Equals($mappedValue, [StringComparison]::OrdinalIgnoreCase)) {
                throw "$CsvPath maps Organizational Unit '$orgUnit' to conflicting $ValueType values '$existing' and '$mappedValue'."
            }
            continue
        }

        $byOrgUnit[$key] = [pscustomobject]@{
            organizational_unit = $orgUnit
            mapped_value = $mappedValue
        }
    }

    return @($byOrgUnit.Values)
}

function Invoke-Psql {
    param(
        [string[]]$Arguments,
        [string]$FailureMessage
    )

    & $script:PsqlExecutable "--dbname=$script:ConnectionString" '--set=ON_ERROR_STOP=1' @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw $FailureMessage
    }
}

function Ensure-RbinSchema {
    $state = & $script:PsqlExecutable "--dbname=$script:ConnectionString" '--set=ON_ERROR_STOP=1' '--tuples-only' '--no-align' '--command' @'
SELECT CASE
    WHEN TO_REGCLASS('public.org_unit_range_mappings') IS NOT NULL
     AND TO_REGCLASS('public.org_unit_function_mappings') IS NOT NULL THEN 'ready'
    WHEN TO_REGCLASS('public.rbin_namelist') IS NULL
     AND TO_REGCLASS('public.rbin_namelist_imports') IS NULL THEN 'fresh'
    ELSE 'migrate'
END;
'@
    if ($LASTEXITCODE -ne 0) {
        throw 'Could not inspect the RBIN database schema.'
    }

    $state = ([string]$state).Trim()
    if ($state -eq 'ready') {
        return
    }

    $schemaFile = if ($state -eq 'fresh') {
        Join-Path $repoRoot 'apps\sql\rbin_namelist_creation.sql'
    } else {
        Join-Path $repoRoot 'apps\sql\rbin_cleaning_migration.sql'
    }

    Write-Host "Applying $(Split-Path -Leaf $schemaFile)..."
    Invoke-Psql @('--file', $schemaFile) 'The RBIN schema could not be created or migrated.'
}

function Import-Mapping {
    param(
        [object[]]$Rows,
        [ValidateSet('range', 'function')]
        [string]$ValueType,
        [string]$SourcePath
    )

    $tempPath = Join-Path ([System.IO.Path]::GetTempPath()) "rbin-$ValueType-$([Guid]::NewGuid().ToString('N')).csv"
    try {
        $Rows |
            Select-Object organizational_unit, mapped_value |
            Export-Csv -LiteralPath $tempPath -NoTypeInformation -Encoding UTF8

        $tableName = if ($ValueType -eq 'range') { 'org_unit_range_mappings' } else { 'org_unit_function_mappings' }
        $columnName = if ($ValueType -eq 'range') { 'range_value' } else { 'function_value' }
        $sourceName = (Split-Path -Leaf $SourcePath).Replace("'", "''")
        $copyPath = $tempPath.Replace('\', '/').Replace("'", "''")
        $createTemp = "BEGIN; CREATE TEMP TABLE mapping_load (organizational_unit text, mapped_value text) ON COMMIT DROP;"
        $copy = "\copy mapping_load (organizational_unit, mapped_value) FROM '$copyPath' WITH (FORMAT csv, HEADER true)"
        $upsert = @"
INSERT INTO public.$tableName (organizational_unit, $columnName, source_file_name)
SELECT BTRIM(organizational_unit), BTRIM(mapped_value), '$sourceName'
FROM mapping_load
ON CONFLICT (LOWER(BTRIM(organizational_unit))) DO UPDATE
SET $columnName = EXCLUDED.$columnName,
    source_file_name = EXCLUDED.source_file_name,
    updated_at = CURRENT_TIMESTAMP;
COMMIT;
"@

        Invoke-Psql @('--command', $createTemp, '--command', $copy, '--command', $upsert) "The $ValueType mapping could not be loaded."
    } finally {
        Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
    }
}

$script:ConnectionString = Get-DatabaseUrl
$script:PsqlExecutable = Get-PsqlPath
$rangeRows = @(Read-MappingCsv -CsvPath $RangeCsv -ValueType range)
$functionRows = @(Read-MappingCsv -CsvPath $FunctionCsv -ValueType function)

Write-Host "Validated $($rangeRows.Count) Range mappings and $($functionRows.Count) Function mappings."
Ensure-RbinSchema
Import-Mapping -Rows $rangeRows -ValueType range -SourcePath $RangeCsv
Import-Mapping -Rows $functionRows -ValueType function -SourcePath $FunctionCsv

$counts = & $script:PsqlExecutable "--dbname=$script:ConnectionString" '--set=ON_ERROR_STOP=1' '--tuples-only' '--no-align' '--field-separator=|' '--command' @'
SELECT
    (SELECT COUNT(*) FROM public.org_unit_range_mappings),
    (SELECT COUNT(*) FROM public.org_unit_function_mappings);
'@
if ($LASTEXITCODE -ne 0) {
    throw 'Mappings were loaded, but their final counts could not be read.'
}

$countParts = ([string]$counts).Trim().Split('|')
Write-Host "RBIN mappings ready. Range: $($countParts[0]); Function: $($countParts[1])."