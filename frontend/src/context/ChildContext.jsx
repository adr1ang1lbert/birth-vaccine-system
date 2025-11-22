import { useState } from "react";
import { ChildContext } from "./ChildContextContext";

export function ChildProvider({ children }) {
  const [childrenData, setChildrenData] = useState([
    { id: 1, name: "Baby John", age: "6 months", vaccines: ["BCG", "Polio"] },
  ]);

  const addChild = (child) => {
    setChildrenData([...childrenData, { id: childrenData.length + 1, ...child }]);
  };

  const updateChild = (id, updates) => {
    setChildrenData(
      childrenData.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const removeChild = (id) => {
    setChildrenData(childrenData.filter((c) => c.id !== id));
  };

  return (
    <ChildContext.Provider value={{ childrenData, addChild, updateChild, removeChild }}>
      {children}
    </ChildContext.Provider>
  );
}
