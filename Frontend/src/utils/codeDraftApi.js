import axiosClient from './axiosClient';

export const fetchDrafts = async (problemId, contestId) => {
    try {
        const params = contestId ? { contestId } : {};
        const { data } = await axiosClient.get(`/codedraft/${problemId}`, { params });
        return data;
    }
    catch {
        return {};
    }
};

export const bulkSyncDrafts = async (drafts) => {
    if (!drafts || drafts.length === 0) return;
    try {
        await axiosClient.post('/codedraft/bulk', { drafts });
    }
    catch {
    }
};

export const clearDraftRemote = async (problemId, contestId, language) => {
    try {
        const params = contestId ? { language, contestId } : { language };
        await axiosClient.delete(`/codedraft/${problemId}`, { params });
    }
    catch {
    }
};
