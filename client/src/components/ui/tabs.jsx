import React, { createContext, useContext, useState } from 'react';
import { cn } from '../../lib/utils';

const TabsContext = createContext();

const Tabs = React.forwardRef(({ className, value, onValueChange, children, ...props }, ref) => {
  const [internalValue, setInternalValue] = useState(value);
  
  const currentValue = value !== undefined ? value : internalValue;
  const setValue = onValueChange || setInternalValue;

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: setValue }}>
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
});
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500",
      className
    )}
    {...props}
  />
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('TabsTrigger must be used within a Tabs component');
  }

  const { value: selectedValue, onValueChange } = context;
  const isActive = selectedValue === value;

  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive 
          ? "bg-white text-gray-950 shadow-sm" 
          : "text-gray-600 hover:text-gray-900",
        className
      )}
      onClick={() => onValueChange(value)}
      {...props}
    >
      {children}
    </button>
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef(({ className, value, children, ...props }, ref) => {
  const context = useContext(TabsContext);
  
  if (!context) {
    throw new Error('TabsContent must be used within a Tabs component');
  }

  const { value: selectedValue } = context;
  
  if (selectedValue !== value) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
