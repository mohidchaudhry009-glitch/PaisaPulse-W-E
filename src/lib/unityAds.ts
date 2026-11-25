export const UNITY_ADS_CONFIG = {
  gameId: '800452643',
  organizationCoreId: '18968556478878',
  rewardedPlacementId: 'BP_Rewarded_Android',
} as const;

interface NativeAndroidUnityAdsBridge {
  initialize?: (gameId: string) => void;
  showRewardedAd: (gameId: string, placementId: string) => void;
}

interface CapacitorUnityAdsPlugin {
  initialize?: (options: { gameId: string }) => Promise<void>;
  showRewardedAd?: (options: {
    gameId: string;
    placementId: string;
  }) => Promise<{ completed: boolean }>;
}

declare global {
  interface Window {
    AndroidUnityAds?: NativeAndroidUnityAdsBridge;
    UnityAdsBridge?: NativeAndroidUnityAdsBridge;
    Capacitor?: {
      Plugins?: {
        UnityAds?: CapacitorUnityAdsPlugin;
      };
    };
    onUnityRewardedComplete?: (placementId?: string) => void;
    onUnityRewardedSkipped?: (placementId?: string) => void;
    onUnityRewardedError?: (message?: string) => void;
  }
}

export function isNativeUnityBridgeAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.AndroidUnityAds?.showRewardedAd ||
      window.UnityAdsBridge?.showRewardedAd ||
      window.Capacitor?.Plugins?.UnityAds?.showRewardedAd
  );
}

export function initializeUnityAds(): void {
  if (typeof window === 'undefined') return;

  const nativeBridge = window.AndroidUnityAds ?? window.UnityAdsBridge;
  if (nativeBridge?.initialize) {
    try {
      nativeBridge.initialize(UNITY_ADS_CONFIG.gameId);
    } catch {
      // Ignore initialization errors when running outside native Android runtime
    }
  }

  const capPlugin = window.Capacitor?.Plugins?.UnityAds;
  if (capPlugin?.initialize) {
    void capPlugin.initialize({ gameId: UNITY_ADS_CONFIG.gameId }).catch(() => undefined);
  }
}

export type UnityAdOutcome = 'completed' | 'skipped' | 'web_fallback';

export async function showUnityRewardedAd(): Promise<UnityAdOutcome> {
  if (typeof window === 'undefined') return 'web_fallback';

  const capPlugin = window.Capacitor?.Plugins?.UnityAds;
  if (capPlugin?.showRewardedAd) {
    const result = await capPlugin.showRewardedAd({
      gameId: UNITY_ADS_CONFIG.gameId,
      placementId: UNITY_ADS_CONFIG.rewardedPlacementId,
    });
    return result.completed ? 'completed' : 'skipped';
  }

  const nativeBridge = window.AndroidUnityAds ?? window.UnityAdsBridge;
  if (nativeBridge?.showRewardedAd) {
    return new Promise<UnityAdOutcome>((resolve, reject) => {
      const cleanup = () => {
        delete window.onUnityRewardedComplete;
        delete window.onUnityRewardedSkipped;
        delete window.onUnityRewardedError;
      };

      window.onUnityRewardedComplete = () => {
        cleanup();
        resolve('completed');
      };

      window.onUnityRewardedSkipped = () => {
        cleanup();
        resolve('skipped');
      };

      window.onUnityRewardedError = (message?: string) => {
        cleanup();
        reject(new Error(message || 'Unity rewarded ad failed to load.'));
      };

      try {
        nativeBridge.showRewardedAd(
          UNITY_ADS_CONFIG.gameId,
          UNITY_ADS_CONFIG.rewardedPlacementId
        );
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error('Unable to launch Unity rewarded ad.'));
      }
    });
  }

  return 'web_fallback';
}
