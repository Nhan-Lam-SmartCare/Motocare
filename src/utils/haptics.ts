/**
 * Mobile Haptic Feedback Utility
 * Uses the Vibration API to provide tactile feedback
 */

type HapticType = 'success' | 'error' | 'warning' | 'selection' | 'light' | 'medium' | 'heavy';

export const triggerHaptic = (type: HapticType = 'selection') => {
    // Check if vibration is supported
    if (typeof navigator === 'undefined' || !navigator.vibrate) {
        return;
    }

    try {
        switch (type) {
            case 'success':
                // Two short vibrations
                navigator.vibrate([10, 50, 20]);
                break;
            case 'error':
                // Long vibration
                navigator.vibrate([50, 100, 50, 100]);
                break;
            case 'warning':
                navigator.vibrate(100);
                break;
            case 'selection':
            case 'light':
                navigator.vibrate(10);
                break;
            case 'medium':
                navigator.vibrate(20);
                break;
            case 'heavy':
                navigator.vibrate(40);
                break;
        }
    } catch (e) {
        // Ignore errors (e.g. if user interaction is required first)
        console.debug('Haptic feedback failed:', e);
    }
};
