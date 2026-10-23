import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api/v1'

/** Cliente HTTP de la API. Los componentes no lo usan directo: pasan por los servicios de cada feature. */
export const api = axios.create({
  baseURL: API_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
})
