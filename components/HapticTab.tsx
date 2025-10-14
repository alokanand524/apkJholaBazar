import * as Haptics from 'expo-haptics';
import { TouchableOpacity } from 'react-native';

export function HapticTab(props: any) {
  return (
    <TouchableOpacity
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
