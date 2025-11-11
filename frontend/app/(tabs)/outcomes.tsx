import { useState, useEffect } from "react";
import { View,Text,StyleSheet,useWindowDimensions,Platform,ActivityIndicator,ScrollView,} from "react-native";
import { LoadingScreen } from "@/components/loadingScreen";
import { commonStyles } from "@/constants/styles";

export default function OutcomesScreen() {
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);

  
  if (loading) return <LoadingScreen text="Loading data..." />; 

  return (
    <View style={commonStyles.container}>
      <View style={[commonStyles.header, width >=700 && {justifyContent: "center"}]}>
        <Text style={[commonStyles.headerTitle, width >= 700 && {width : 700}]}>Outcomes</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[commonStyles.form , width >=700 && { width : 700, alignSelf: "center"}]}>


     
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({



});
