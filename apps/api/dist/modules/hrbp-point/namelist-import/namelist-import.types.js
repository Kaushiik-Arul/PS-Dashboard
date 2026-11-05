"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rbinExceptionColumns = exports.namelistColumnLabels = exports.namelistColumns = void 0;
exports.namelistColumns = [
    'pers_no', 'personnel_number', 'employee_group', 'lp', 'esgrp',
    'employee_subgroup', 'ps_group', 'organizational_unit', 'range', 'function',
    'organisational_area_pa', 'gender_key', 'location', 'pa', 'personnel_area',
    'psubarea', 'personnel_subarea', 'nt_id', 'global_id', 'cost_center',
    'birth_date', 'joining_date', 'entry_for_retirement', 'designation_text',
    'hrbp_global_id', 'hrbp2_global_id', 'official_email', 'technical_entry_date',
    'direct_or_indirect',
];
exports.namelistColumnLabels = {
    pers_no: 'Pers.No.',
    personnel_number: 'Personnel Number',
    employee_group: 'Employee Group',
    lp: 'LP',
    esgrp: 'ESgrp',
    employee_subgroup: 'Employee Subgroup',
    ps_group: 'PS group',
    organizational_unit: 'Organizational Unit',
    range: 'Range',
    function: 'Function',
    organisational_area_pa: 'Organisational Area(PA)',
    gender_key: 'Gender Key',
    location: 'Location',
    pa: 'PA',
    personnel_area: 'Personnel Area',
    psubarea: 'PSubarea',
    personnel_subarea: 'Personnel Subarea',
    nt_id: 'NT_ID',
    global_id: 'Global ID',
    cost_center: 'Cost Ctr',
    birth_date: 'Birth date',
    joining_date: 'Date of Joining',
    entry_for_retirement: 'Entry for Retirement',
    designation_text: 'Designation Text',
    hrbp_global_id: 'Global-Id of HRBP',
    hrbp2_global_id: 'Global-Id of HRBP2',
    official_email: 'Email Official',
    technical_entry_date: 'Technical Entry Date',
    direct_or_indirect: 'Direct or Indirect',
};
exports.rbinExceptionColumns = exports.namelistColumns.filter((column) => column !== 'pers_no' && column !== 'personnel_number');
//# sourceMappingURL=namelist-import.types.js.map