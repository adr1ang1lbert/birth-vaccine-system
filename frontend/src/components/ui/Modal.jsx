// src/components/ui/Modal.jsx
import React from "react";

export default function Modal({ title, children, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "10px",
          padding: "20px",
          width: "80%",
          maxWidth: "700px",
          boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "15px",
          }}
        >
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button
            onClick={onClose}
            style={{
              background: "#e74c3c",
              color: "white",
              border: "none",
              borderRadius: "5px",
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            ✖
          </button>
        </div>

        {/* Modal Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}