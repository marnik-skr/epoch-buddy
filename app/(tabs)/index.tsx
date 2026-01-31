import { Redirect } from 'expo-router';
import { StyleSheet } from 'react-native';


export default function HomeScreen() {
  return <Redirect href="/welcome" />;
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 70,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
});

