const PREFIX = 'coddex_code_draft';

const buildKey = (problemId, contestId, language) => `${PREFIX}:${problemId}:${contestId || ''}:${language}`;

export const getLocalDraft = (problemId, contestId, language) => {
    try {
        return localStorage.getItem(buildKey(problemId, contestId, language));
    }
    catch {
        return null;
    }
};

export const setLocalDraft = (problemId, contestId, language, code) => {
    try {
        localStorage.setItem(buildKey(problemId, contestId, language), code);
    }
    catch {
    }
};

export const clearLocalDraft = (problemId, contestId, language) => {
    try {
        localStorage.removeItem(buildKey(problemId, contestId, language));
    }
    catch {
    }
};

export const getAllLocalDrafts = () => {
    const drafts = [];
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(`${PREFIX}:`)) continue;
            const rest = key.slice(PREFIX.length + 1);
            const [problemId, contestId, language] = rest.split(':');
            if (!problemId || !language) continue;
            const code = localStorage.getItem(key);
            drafts.push({ problemId, contestId: contestId || null, language, code });
        }
    }
    catch {
    }
    return drafts;
};
