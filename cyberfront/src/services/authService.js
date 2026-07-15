import axios from "axios";

const API = axios.create({
  baseURL: window.API_BASE_URL + "/api/auth"
});

export const sendOtp = async (email) => {
  const res = await API.post(`/send-otp?email=${email}`);
  return res.data;
};

export const verifyOtp = async (email, otp) => {
  const res = await API.post(`/verify-otp?email=${email}&otp=${otp}`);
  return res.data;
};