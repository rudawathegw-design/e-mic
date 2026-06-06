// tweaks.jsx — production stand-in for the design-time Tweaks panel.
// Keeps useTweaks (with localStorage persistence so the chosen theme sticks)
// and turns every Tweak* control + the panel itself into no-ops, so the app
// renders the clean product UI without the authoring overlay.
const { useState } = React;

function useTweaks(defaults) {
  const [t, setT] = useState(() => {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem("ea-tweaks") || "{}") }; }
    catch { return { ...defaults }; }
  });
  const setTweak = (k, v) =>
    setT((prev) => {
      const next = { ...prev, [k]: v };
      try { localStorage.setItem("ea-tweaks", JSON.stringify(next)); } catch {}
      return next;
    });
  return [t, setTweak];
}

const Noop = () => null;
const TweaksPanel = Noop;
const TweakSection = Noop;
const TweakRow = Noop;
const TweakSlider = Noop;
const TweakToggle = Noop;
const TweakRadio = Noop;
const TweakSelect = Noop;
const TweakText = Noop;
const TweakNumber = Noop;
const TweakColor = Noop;
const TweakButton = Noop;

Object.assign(window, {
  useTweaks, TweaksPanel, TweakSection, TweakRow, TweakSlider, TweakToggle,
  TweakRadio, TweakSelect, TweakText, TweakNumber, TweakColor, TweakButton,
});
