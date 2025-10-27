import { COLORS } from './colors';
import { StyleSheet, Platform } from "react-native";

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop : Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    backgroundColor: COLORS.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  
  secondaryHeader: {
    paddingHorizontal: 20,
    paddingTop : Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 20,
    backgroundColor: COLORS.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },

  secondaryHeaderTitle: { 
    fontSize: 20, 
    fontWeight: "600", 
    color: COLORS.text,
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
  
  input: {
    borderWidth: 1,
    flex : 1,
    borderColor: COLORS.inputBorderColor,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: COLORS.inputBackground,
  },

  headerInfo :{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal:20,
  },

  inputTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 6,
    marginLeft: 5,
  },

  button: {
    backgroundColor: COLORS.butonBackground,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    alignSelf : "center",
    width : 300,
  },

  buttonText: {
    color: COLORS.butonText,
    fontSize: 16,
    fontWeight: "600", 
  },

  addButton: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
     marginLeft: "auto" ,    
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.subtitle,
  },

  title : {
    fontSize: 19,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  
  notes: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.text,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.primary,
    marginTop: 30,
    alignSelf: "center",
  },

  form: {
    paddingHorizontal: 24,
  },
});
