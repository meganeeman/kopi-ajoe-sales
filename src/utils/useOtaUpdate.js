import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';

export const useOtaUpdate = () => {
  useEffect(() => {
    async function checkOtaUpdate() {
      try {
        if (__DEV__) return;

        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          const updateMessage = 'Update tersedia, sedang merestart aplikasi...';
          if (Platform.OS === 'android') {
            ToastAndroid.show(updateMessage, ToastAndroid.LONG);
          } else {
            Alert.alert('Update', updateMessage);
          }

          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch (error) {
        console.log('Gagal cek update OTA:', error);
      }
    }

    checkOtaUpdate();
  }, []);
};