import { endpoints } from "./endpoints";
import { axiosInstance } from "./axios";

export const apiMethod = {
    query: (body: string) => {
        return axiosInstance.post(endpoints.query, body);
    }
}