// icons.jsx — line icon set for EA MIC. Exported to window.
const Ic = ({ d, size = 17, fill = "none", stroke = 2, children, vb = "0 0 24 24" }) => (
  <svg width={size} height={size} viewBox={vb} fill={fill} stroke="currentColor"
       strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d} /> : children}
  </svg>
);

const IconHome   = (p) => <Ic {...p} d="M3 10.5 12 3l9 7.5M5 9.5V20h14V9.5" />;
const IconHistory= (p) => <Ic {...p}><path d="M3 5v5h5"/><path d="M3.5 10a9 9 0 1 1 .5 5"/><path d="M12 7v5l3.5 2"/></Ic>;
const IconBook   = (p) => <Ic {...p}><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15.5H5.5A1.5 1.5 0 0 0 4 20"/><path d="M4 4.5V20"/><path d="M8 8h8M8 11.5h6"/></Ic>;
const IconGear   = (p) => <Ic {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1M18.4 18.4l-2.1-2.1M7.7 7.7 5.6 5.6"/></Ic>;
const IconDownload=(p) => <Ic {...p}><path d="M12 3v12m0 0 4-4m-4 4-4-4"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/></Ic>;
const IconSearch = (p) => <Ic {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></Ic>;
const IconCopy   = (p) => <Ic {...p}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Ic>;
const IconTrash  = (p) => <Ic {...p}><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></Ic>;
const IconCheck  = (p) => <Ic {...p} d="M4 12.5 9 17.5 20 6.5" />;
const IconPlus   = (p) => <Ic {...p} d="M12 5v14M5 12h14" />;
const IconKey    = (p) => <Ic {...p}><circle cx="8" cy="8" r="4.5"/><path d="m11.5 11.5 8 8M16 16l2.5-2.5M19 19l2-2"/></Ic>;
const IconSpark  = (p) => <Ic {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.5 6.5 9 9M15 15l2.5 2.5M17.5 6.5 15 9M9 15l-2.5 2.5"/></Ic>;
const IconRefresh= (p) => <Ic {...p}><path d="M20 11A8 8 0 0 0 6 6L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14 5l2-2"/><path d="M20 20v-4h-4"/></Ic>;
const IconShield = (p) => <Ic {...p}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></Ic>;
const IconClock  = (p) => <Ic {...p}><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></Ic>;
const IconWave   = (p) => <Ic {...p}><path d="M4 12h0M8 8v8M12 5v14M16 9v6M20 12h0"/></Ic>;
const IconType   = (p) => <Ic {...p}><path d="M5 7V5h14v2M12 5v14M9 19h6"/></Ic>;
const IconVolume = (p) => <Ic {...p}><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 9a4 4 0 0 1 0 6"/></Ic>;
const IconCpu    = (p) => <Ic {...p}><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 1.5V4M15 1.5V4M9 20v2.5M15 20v2.5M1.5 9H4M1.5 15H4M20 9h2.5M20 15h2.5"/></Ic>;
const IconGlobe  = (p) => <Ic {...p}><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17"/></Ic>;
const IconLock   = (p) => <Ic {...p}><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></Ic>;
const IconArrowLeft = (p) => <Ic {...p} d="M14 6l-6 6 6 6" />;
const IconCard   = (p) => <Ic {...p}><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 9.5h18M6.5 14.5h4"/></Ic>;

Object.assign(window, {
  IconHome, IconHistory, IconBook, IconGear, IconDownload, IconSearch, IconCopy,
  IconTrash, IconCheck, IconPlus, IconKey, IconSpark, IconRefresh, IconShield,
  IconClock, IconWave, IconType, IconVolume, IconCpu, IconGlobe,
  IconLock, IconArrowLeft, IconCard,
});
