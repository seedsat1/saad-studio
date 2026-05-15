import React from "react";

export default function App() {
  const [count, setCount] = React.useState(0);
  
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "#050711",
        color: "#f6f8ff",
        fontFamily: "system-ui"
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1>🎬 Saad Studio</h1>
        <p>Web version is running</p>
        <button
          onClick={() => setCount(count + 1)}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: "#8b5cf6",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          Count: {count}
        </button>
      </div>
    </div>
  );
}
