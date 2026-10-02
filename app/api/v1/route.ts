import { ApiError, failure } from "@/lib/api";

const notFound = async () => failure(new ApiError(404, "Choose an API endpoint under /api/v1"));
export { notFound as GET, notFound as POST, notFound as PATCH, notFound as DELETE, notFound as PUT, notFound as OPTIONS, notFound as HEAD };
