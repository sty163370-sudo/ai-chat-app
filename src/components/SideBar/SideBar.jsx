import React, { useContext } from 'react'
import './SideBard.css'
import { assets } from '../../assets/assets'
import { Context } from '../../context/Context';

const SideBar = () => {
    const {
        getConversationList,
        currentConversationId,
        switchConversation,
        newChat,
        deleteConversation,
    } = useContext(Context);

    const conversations = getConversationList();

    return (
        <div className='sidebar'>
            <div className="top">
                <div onClick={() => newChat()} className="new-chat">
                    <img src={assets.plus_icon} alt="" />
                    <p>New Chat</p>
                </div>
                <div className="recent">
                    <p className='recent-title'>Recent</p>
                    {conversations.length === 0 ? (
                        <p style={{ padding: '10px', color: '#666', fontSize: '14px' }}>
                            暂无对话记录
                        </p>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.id}
                                onClick={() => switchConversation(conv.id)}
                                className={`recent-entry ${
                                    conv.id === currentConversationId ? 'active' : ''
                                }`}
                                style={{
                                    backgroundColor: conv.id === currentConversationId ? '#f0f0f0' : 'transparent',
                                    cursor: 'pointer'
                                }}
                            >
                                <img src={assets.message_icon} alt="" />
                                <p style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {conv.title}
                                </p>
                                <img 
                                    src={assets.trash} 
                                    onClick={(e) => {
                                        e.stopPropagation(); // 阻止冒泡
                                        if (window.confirm('确定要删除这个对话吗？')) {
                                            deleteConversation(conv.id);
                                        }
                                    }} 
                                    alt="删除"
                                    style={{ cursor: 'pointer', opacity: 0.6 }}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>
            <div className="bottom">
                <div className="bottom-item recent-entry">
                    <img src={assets.question_icon} alt="" />
                    <p>Help</p>
                </div>
                <div className="bottom-item recent-entry">
                    <img src={assets.history_icon} alt="" />
                    <p>Activity</p>
                </div>
                <div className="bottom-item recent-entry">
                    <img src={assets.setting_icon} alt="" />
                    <p>Setting</p>
                </div>
            </div>
        </div>
    )
}

export default SideBar;