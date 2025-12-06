/**
 * Standalone music player entry point.
 * Bundles just the music player for use outside the geocities theme.
 */

import { addMusicPlayer } from "./music";

// Expose on window for lazy loading
window.addMusicPlayerStandalone = () => addMusicPlayer();
