import axios from "axios";

export async function config() {
  try {
    const { data } = await axios.get("/api/config");
    return data.config;
  } catch (error) {
    console.error("Error fetching config:", error);
    return null; // or throw error depending on your use-case
  }
}
