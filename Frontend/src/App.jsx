import { useState } from 'react'
import './App.css'
import {Routes,Route,Navigate} from "react-router";
import Homepage from './pages/Homepage'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Settings from './pages/Settings'
import Progress from './pages/Progress'
import Admin from './pages/Admin'
import Premium from './pages/Premium'
import AdminPanel from './components/AdminPanel'
import AdminUpdate from './components/AdminUpdate'
import AdminUpdateForm from './components/AdminUpdateForm'
import AdminDelete from './components/AdminDelete'
import ProblemPage from './pages/ProblemPage'
import AdminVideo from './components/AdminVideo'
import AdminUpload from './components/AdminUpload'
import AdminContestCreate from './pages/AdminContestCreate'
import AdminContestEdit from './pages/AdminContestEdit'
import ContestsList from './pages/ContestsList'
import ContestPage from './pages/ContestPage'
import ContestLeaderboard from './pages/ContestLeaderboard'
import RatingLeaderboard from './pages/RatingLeaderboard'
import DailyChallenge from './pages/DailyChallenge'
import {checkAuth} from "./authSlice";
import {useDispatch,useSelector} from "react-redux";
import {useEffect} from 'react';
import {getAllLocalDrafts} from './utils/codeDraftLocal';
import {Plotter} from './design/primitives';

const CODEDRAFT_BULK_URL=(import.meta.env.VITE_API_URL || 'http://localhost:3000')+'/codedraft/bulk';

function App(){
  const {isAuthenticated,loading,user}=useSelector((state)=>state.auth);
  const dispatch=useDispatch();

  useEffect(()=>{
      dispatch(checkAuth());
  },[dispatch]);

  useEffect(()=>{
    if(!isAuthenticated) return;

    const flushDraftsOnExit=()=>{
      const drafts=getAllLocalDrafts();
      if(drafts.length===0) return;
      const blob=new Blob([JSON.stringify({drafts})],{type:'application/json'});
      navigator.sendBeacon(CODEDRAFT_BULK_URL,blob);
    };

    window.addEventListener('pagehide',flushDraftsOnExit);
    window.addEventListener('beforeunload',flushDraftsOnExit);
    return ()=>{
      window.removeEventListener('pagehide',flushDraftsOnExit);
      window.removeEventListener('beforeunload',flushDraftsOnExit);
    };
  },[isAuthenticated]);

  if(loading){
    return (
      <div className="relative z-10 flex min-h-screen items-center justify-center">
        <Plotter label="Loading Coddex" />
      </div>
    );
  }

  return(
  <>
    <Routes>
      <Route path="/" element={isAuthenticated?<Homepage></Homepage>:<Navigate to="/login"/>}></Route>
      <Route path="/login" element={isAuthenticated?<Navigate to="/" />:<Login></Login>}></Route>
      <Route path="/signup" element={isAuthenticated?<Navigate to="/" />:<Signup></Signup>}></Route>
      <Route path="/forgot-password" element={isAuthenticated?<Navigate to="/" />:<ForgotPassword/>}></Route>
      <Route path="/reset-password/:token" element={isAuthenticated?<Navigate to="/" />:<ResetPassword/>}></Route>
      <Route path="/admin" element={isAuthenticated && user?.role==='admin'?<Admin/>:<Navigate to="/"/>}></Route>
      <Route path="/admin/create" element={isAuthenticated && user?.role==='admin'?<AdminPanel/>:<Navigate to="/"/>}></Route>
      <Route path="/admin/update" element={isAuthenticated && user?.role==='admin'?<AdminUpdate/>:<Navigate to="/"/>}></Route>
      <Route path="/admin/update/:id" element={isAuthenticated && user?.role==='admin'?<AdminUpdateForm/>:<Navigate to="/"/>}></Route>
      <Route path="/admin/delete" element={isAuthenticated && user?.role==='admin'?<AdminDelete/>:<Navigate to="/"/>}></Route>
      <Route path="/admin/video" element={isAuthenticated && user?.role==='admin'?<AdminVideo/>:<Navigate to="/"/>}></Route>
      <Route path="/admin/upload/:problemId" element={isAuthenticated && user?.role==='admin'?<AdminUpload/>:<Navigate to="/"/>}></Route>
      <Route path="/admin/contest/create" element={isAuthenticated && user?.role==='admin'?<AdminContestCreate/>:<Navigate to="/"/>}></Route>
      <Route path="/admin/contest/edit/:contestId" element={isAuthenticated && user?.role==='admin'?<AdminContestEdit/>:<Navigate to="/"/>}></Route>
      <Route path="/contests" element={isAuthenticated?<ContestsList/>:<Navigate to="/login"/>}></Route>
      <Route path="/contest/:contestId" element={isAuthenticated?<ContestPage/>:<Navigate to="/login"/>}></Route>
      <Route path="/contest/:contestId/leaderboard" element={isAuthenticated?<ContestLeaderboard/>:<Navigate to="/login"/>}></Route>
      <Route path="/leaderboard" element={isAuthenticated?<RatingLeaderboard/>:<Navigate to="/login"/>}></Route>
      <Route path="/daily-challenge" element={isAuthenticated?<DailyChallenge/>:<Navigate to="/login"/>}></Route>
      <Route path="/premium" element={isAuthenticated?<Premium/>:<Navigate to="/login"/>}></Route>
      <Route path="/settings" element={isAuthenticated?<Settings/>:<Navigate to="/login"/>}></Route>
      <Route path="/progress" element={isAuthenticated?<Progress/>:<Navigate to="/login"/>}></Route>
      <Route path="/problem" element={isAuthenticated?<ProblemPage/>:<Navigate to="/login"/>}></Route>
      <Route path="/problem/:problemId" element={<ProblemPage/>}></Route>
    </Routes>
  </>
  )
}

export default App
