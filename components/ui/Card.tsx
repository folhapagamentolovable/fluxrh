
import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className = '', style, onClick }) => {
    return (
        <div className={`bg-white rounded-2xl shadow-md p-6 ${className}`} style={style} onClick={onClick}>
            {children}
        </div>
    );
};

export default Card;
