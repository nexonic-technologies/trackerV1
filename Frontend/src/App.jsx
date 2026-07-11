import { useState } from "react";
import BaseLayout from "./layouts/baseLayouts";
import { Toaster } from "react-hot-toast";
import SplashScreen from "./components/SplashScreen";

function App() {
  const [splashDone, setSplashDone] = useState(() => {
    return sessionStorage.getItem("splashShown") === "true";
  });

  const handleSplashFinish = () => {
    sessionStorage.setItem("splashShown", "true");
    setSplashDone(true);
  };

  return (
    <>
      <Toaster position="top-right" />
      {!splashDone && <SplashScreen onFinish={handleSplashFinish} />}
      <BaseLayout />
    </>
  );
}

export default App;
