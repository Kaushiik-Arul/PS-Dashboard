import { type ParsedRbinRow, type UploadedRbinFile } from './rbin-cleaning.types';
export declare function parseRbinFile(file: UploadedRbinFile): Promise<ParsedRbinRow[]>;
