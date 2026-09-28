import { forwardJdManagementRequest, jdManagementErrorResponse } from '@/features/hrbp-point/jd-management.api';

export async function GET(request: Request) {
  try {
    const response = await forwardJdManagementRequest('employee-jd-movements', new URL(request.url).search);
    return Response.json(await response.json());
  } catch (error) { return jdManagementErrorResponse(error, 'Unable to load employee JD movements'); }
}