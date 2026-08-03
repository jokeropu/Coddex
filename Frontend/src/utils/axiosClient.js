import axios from "axios";

const axiosClient=axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    withCredentials: true,
    headers:{
        'Content-Type':'application/json'
    }
});

axiosClient.interceptors.response.use(
    (response)=>response,
    (error)=>{
        const path=window.location.pathname;
        const isPublicAuthPage=path==='/login' || path==='/signup' || path==='/forgot-password' || path.startsWith('/reset-password/');
        if(error.response?.status===401 && !isPublicAuthPage){
            window.location.assign('/login');
        }

        if(!error.response){
            error.message = navigator.onLine
                ? "Can't reach the Coddex server right now. Please try again in a moment."
                : "You're offline. Check your connection and try again.";
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
