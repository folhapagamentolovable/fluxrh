import React from 'react';

interface TabsProps {
    children: React.ReactNode;
    defaultValue?: string;
    value?: string;
    onValueChange?: (value: string) => void;
    className?: string;
}

interface TabsListProps {
    children: React.ReactNode;
    className?: string;
}

interface TabsTriggerProps {
    children: React.ReactNode;
    value: string;
    className?: string;
    onClick?: () => void;
}

interface TabsContentProps {
    children: React.ReactNode;
    value: string;
    className?: string;
}

const TabsContext = React.createContext<{
    activeTab: string;
    setActiveTab: (value: string) => void;
}>({
    activeTab: '',
    setActiveTab: () => {}
});

const Tabs: React.FC<TabsProps> = ({ 
    children, 
    defaultValue = '', 
    value, 
    onValueChange, 
    className = '' 
}) => {
    const [internalActiveTab, setInternalActiveTab] = React.useState(defaultValue);
    
    const activeTab = value !== undefined ? value : internalActiveTab;
    
    const setActiveTab = (newValue: string) => {
        if (value === undefined) {
            setInternalActiveTab(newValue);
        }
        onValueChange?.(newValue);
    };

    return (
        <TabsContext.Provider value={{ activeTab, setActiveTab }}>
            <div className={className}>
                {children}
            </div>
        </TabsContext.Provider>
    );
};

const TabsList: React.FC<TabsListProps> = ({ children, className = '' }) => {
    return (
        <div className={`flex border-b border-gray-200 ${className}`}>
            {children}
        </div>
    );
};

const TabsTrigger: React.FC<TabsTriggerProps> = ({ 
    children, 
    value, 
    className = '',
    onClick 
}) => {
    const { activeTab, setActiveTab } = React.useContext(TabsContext);
    
    const isActive = activeTab === value;
    
    const handleClick = () => {
        setActiveTab(value);
        onClick?.();
    };
    
    return (
        <button
            onClick={handleClick}
            className={`
                px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${isActive 
                    ? 'border-blue-500 text-blue-600 bg-blue-50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
                ${className}
            `}
        >
            {children}
        </button>
    );
};

const TabsContent: React.FC<TabsContentProps> = ({ 
    children, 
    value, 
    className = '' 
}) => {
    const { activeTab } = React.useContext(TabsContext);
    
    if (activeTab !== value) {
        return null;
    }
    
    return (
        <div className={`mt-4 ${className}`}>
            {children}
        </div>
    );
};

export { Tabs, TabsList, TabsTrigger, TabsContent };