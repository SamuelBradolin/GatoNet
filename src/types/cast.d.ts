import React from 'react';

declare module 'react' {
  interface VideoHTMLAttributes<T> extends React.HTMLAttributes<T> {
    'x-webkit-airplay'?: 'allow' | 'deny' | string;
    airplay?: 'allow' | 'deny' | string;
    disableRemotePlayback?: boolean;
  }
}

declare global {
  interface HTMLVideoElement {
    webkitShowPlaybackTargetPicker?: () => void;
    webkitCurrentPlaybackTargetIsWireless?: boolean;
  }

  interface Window {
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
    cast?: any;
    chrome?: any;
    WebKitPlaybackTargetAvailabilityEvent?: any;
  }
}
