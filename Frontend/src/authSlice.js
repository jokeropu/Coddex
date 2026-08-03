import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import axiosClient from './utils/axiosClient'
import { bulkSyncDrafts } from './utils/codeDraftApi';
import { getAllLocalDrafts } from './utils/codeDraftLocal';

const extractErrorMessage=(error)=>{
    const data=error.response?.data;
    if(typeof data==='string') return data;
    if(data?.error) return data.error;
    if(data?.message) return data.message;
    return error.message;
};

export const registerUser=createAsyncThunk(
    'auth/register',
    async (userData,{rejectWithValue})=>{
        try{
            const response=await axiosClient.post('/user/register',userData);
            return response.data.user;
        }
        catch(error){
            return rejectWithValue({message:extractErrorMessage(error)});
        }
    }
);


export const loginUser=createAsyncThunk(
    'auth/login',
    async(credentials,{rejectWithValue})=>{
        try{
            const response=await axiosClient.post('/user/login',credentials);
            return response.data.user;
        }
        catch(error){
            return rejectWithValue({message:extractErrorMessage(error)});
        }
    }
);

export const googleAuth=createAsyncThunk(
    'auth/googleAuth',
    async(credential,{rejectWithValue})=>{
        try{
            const response=await axiosClient.post('/user/google',{credential});
            return response.data.user;
        }
        catch(error){
            return rejectWithValue({message:extractErrorMessage(error)});
        }
    }
);

export const checkAuth=createAsyncThunk(
    'auth/check',
    async (_,{rejectWithValue})=>{
        try{
            const {data}=await axiosClient.get('/user/check');
            return data.user;
        }
        catch(error){
            if(error.response?.status===401){
                return rejectWithValue(null);
            }
            return rejectWithValue({message:extractErrorMessage(error)});
        }
    }
);

export const logoutUser=createAsyncThunk(
    'auth/logout',
    async(_,{rejectWithValue})=>{
        try{
            await bulkSyncDrafts(getAllLocalDrafts());
            await axiosClient.post('/user/logout');
            return null;
        }
        catch(error){
            return rejectWithValue({message:extractErrorMessage(error)});
        }
    }
);

const authSlice=createSlice({
    name:'auth',
    initialState:{
        user:null,
        isAuthenticated:false,
        loading:true,
        error:null
    },
    reducers:{
        updateUserProfile:(state,action)=>{
            if(state.user){
                state.user={...state.user,...action.payload};
            }
        }
    },
    extraReducers:(builder)=>{
        builder
        .addCase(registerUser.pending,(state)=>{
            state.loading=true;
            state.error=null;
        })
        .addCase(registerUser.fulfilled,(state,action)=>{
            state.loading=false;
            state.isAuthenticated= !!action.payload;
            state.user=action.payload;
        })
        .addCase(registerUser.rejected,(state,action)=>{
            state.loading=false;
            state.error=action.payload?.message || 'Something went wrong';
            state.isAuthenticated=false;
            state.user=null;
        })
  

        .addCase(loginUser.pending,(state)=>{
            state.loading=true;
            state.error=null;
        })
        .addCase(loginUser.fulfilled,(state,action)=>{
            state.loading=false;
            state.isAuthenticated= !!action.payload;
            state.user=action.payload;
        })
        .addCase(loginUser.rejected,(state,action)=>{
            state.loading=false;
            state.error=action.payload?.message || 'Something went wrong';
            state.isAuthenticated=false;
            state.user=null;
        })
  
        .addCase(googleAuth.pending,(state)=>{
            state.loading=true;
            state.error=null;
        })
        .addCase(googleAuth.fulfilled,(state,action)=>{
            state.loading=false;
            state.isAuthenticated= !!action.payload;
            state.user=action.payload;
        })
        .addCase(googleAuth.rejected,(state,action)=>{
            state.loading=false;
            state.error=action.payload?.message || 'Something went wrong';
            state.isAuthenticated=false;
            state.user=null;
        })

        .addCase(checkAuth.pending,(state)=>{
            state.loading=true;
            state.error=null;
        })
        .addCase(checkAuth.fulfilled,(state,action)=>{
            state.loading=false;
            state.isAuthenticated= !!action.payload;
            state.user=action.payload;
        })
        .addCase(checkAuth.rejected,(state,action)=>{
            state.loading=false;
            
            state.error=action.payload ? (action.payload?.message || 'Something went wrong') : null;
            state.isAuthenticated=false;
            state.user=null;
        })
  
        .addCase(logoutUser.pending,(state)=>{
            state.loading=true;
            state.error=null;
        })
        .addCase(logoutUser.fulfilled,(state)=>{
            state.loading=false;
            state.user=null;
            state.isAuthenticated=false;
            state.error=null;
        })
        .addCase(logoutUser.rejected,(state,action)=>{
            state.loading=false;
            state.error=action.payload?.message || 'Something went wrong';
            state.isAuthenticated=false;
            state.user=null;
        });
    }
});

export const {updateUserProfile}=authSlice.actions;
export default authSlice.reducer;