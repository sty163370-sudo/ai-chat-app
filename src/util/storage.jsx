// ========== localStorage 存储工具函数 ==========

// 存储键名
const STORAGE_KEY = 'yuan-chat-conversations';
const CURRENT_CONVERSATION_KEY = 'yuan-chat-current-conversation';
const STORAGE_VERSION = '1.0';

// ========== Map 与数组转换 ==========

/**
 * 将 Map 转换为可序列化的数组格式
 * @param {Map} map - 要转换的 Map 对象
 * @returns {Array} 数组格式 [[key, value], ...]
 */
export const mapToArray = (map) => {
    if (!map || !(map instanceof Map)) return [];
    return Array.from(map.entries());
};

/**
 * 将数组格式转换回 Map
 * @param {Array} array - 数组格式 [[key, value], ...]
 * @returns {Map} Map 对象
 */
export const arrayToMap = (array) => {
    if (!array || !Array.isArray(array)) return new Map();
    try {
        return new Map(array);
    } catch (error) {
        console.error('转换数组到 Map 失败:', error);
        return new Map();
    }
};

// ========== 对话数据存储 ==========

/**
 * 从 localStorage 加载对话数据
 * @returns {Map} 对话 Map 对象
 */
export const loadConversationsFromStorage = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            // 验证数据格式
            if (Array.isArray(data)) {
                return arrayToMap(data);
            }
        }
    } catch (error) {
        console.error('加载对话数据失败:', error);
        // 如果数据损坏，清除存储
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.error('清除损坏数据失败:', e);
        }
    }
    return new Map();
};

/**
 * 保存对话数据到 localStorage
 * @param {Map} conversations - 对话 Map 对象
 */
export const saveConversationsToStorage = (conversations) => {
    try {
        const data = mapToArray(conversations);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error('保存对话数据失败:', error);
        
        // 如果存储空间不足，尝试清理旧数据
        if (error.name === 'QuotaExceededError') {
            console.warn('存储空间不足，尝试清理旧数据');
            try {
                // 只保留最近的 20 个对话
                const entries = mapToArray(conversations);
                entries.sort((a, b) => (b[1]?.createdAt || 0) - (a[1]?.createdAt || 0));
                const kept = entries.slice(0, 20);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(kept));
                console.log('已清理旧数据，保留最近 20 个对话');
            } catch (cleanupError) {
                console.error('清理数据失败:', cleanupError);
            }
        }
    }
};

// ========== 当前对话 ID 存储 ==========

/**
 * 保存当前对话 ID
 * @param {string} conversationId - 对话 ID
 */
export const saveCurrentConversationId = (conversationId) => {
    try {
        if (conversationId) {
            localStorage.setItem(CURRENT_CONVERSATION_KEY, conversationId);
        } else {
            localStorage.removeItem(CURRENT_CONVERSATION_KEY);
        }
    } catch (error) {
        console.error('保存当前对话 ID 失败:', error);
    }
};

/**
 * 从 localStorage 加载当前对话 ID
 * @returns {string|null} 对话 ID 或 null
 */
export const loadCurrentConversationId = () => {
    try {
        return localStorage.getItem(CURRENT_CONVERSATION_KEY);
    } catch (error) {
        console.error('加载当前对话 ID 失败:', error);
        return null;
    }
};

// ========== 数据管理工具 ==========

/**
 * 清理旧对话（保留最近的 N 个）
 * @param {Map} conversations - 对话 Map 对象
 * @param {number} keepCount - 保留的对话数量，默认 50
 * @returns {Map} 清理后的 Map 对象
 */
export const cleanupOldConversations = (conversations, keepCount = 50) => {
    try {
        const entries = mapToArray(conversations);
        // 按创建时间倒序排序
        entries.sort((a, b) => (b[1]?.createdAt || 0) - (a[1]?.createdAt || 0));
        // 只保留最近的 N 个
        const kept = entries.slice(0, keepCount);
        const cleanedMap = arrayToMap(kept);
        
        // 保存清理后的数据
        saveConversationsToStorage(cleanedMap);
        
        return cleanedMap;
    } catch (error) {
        console.error('清理旧对话失败:', error);
        return conversations;
    }
};

/**
 * 清空所有对话数据
 */
export const clearAllConversations = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(CURRENT_CONVERSATION_KEY);
        return true;
    } catch (error) {
        console.error('清空对话数据失败:', error);
        return false;
    }
};

/**
 * 获取存储的数据大小（估算）
 * @returns {number} 数据大小（字节）
 */
export const getStorageSize = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            return new Blob([data]).size;
        }
        return 0;
    } catch (error) {
        console.error('获取存储大小失败:', error);
        return 0;
    }
};

/**
 * 导出对话数据（用于备份）
 * @param {Map} conversations - 对话 Map 对象
 * @returns {string} JSON 字符串
 */
export const exportConversations = (conversations) => {
    try {
        const data = mapToArray(conversations);
        return JSON.stringify(data, null, 2);
    } catch (error) {
        console.error('导出对话数据失败:', error);
        return '{}';
    }
};

/**
 * 导入对话数据（用于恢复）
 * @param {string} jsonString - JSON 字符串
 * @returns {Map} 对话 Map 对象
 */
export const importConversations = (jsonString) => {
    try {
        const data = JSON.parse(jsonString);
        if (Array.isArray(data)) {
            const importedMap = arrayToMap(data);
            saveConversationsToStorage(importedMap);
            return importedMap;
        }
        throw new Error('数据格式错误');
    } catch (error) {
        console.error('导入对话数据失败:', error);
        throw error;
    }
};