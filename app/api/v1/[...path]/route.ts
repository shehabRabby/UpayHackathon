import { ApiError, failure } from "@/lib/api";

export const dynamic = "force-dynamic";
const notFound = async () => failure(new ApiError(404, "API endpoint not found"));
export { notFound as GET, notFound as POST, notFound as PATCH, notFound as DELETE, notFound as PUT, notFound as OPTIONS, notFound as HEAD };
