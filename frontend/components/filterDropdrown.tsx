import DropDownPicker from "react-native-dropdown-picker";
import { Dispatch, SetStateAction } from "react";
import { COLORS } from "@/constants/colors";
import { commonStyles } from "@/constants/styles";

interface FilterDropdownProps {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  items: { label: string; value: string }[];
  placeholder: string;
  modalTitle: string;
  small?: boolean;
}

export function FilterDropdown({
  open,
  setOpen,
  value,
  setValue,
  items,
  placeholder,
  modalTitle,
  small = false,
}: FilterDropdownProps) {
  return (
    <DropDownPicker
      open={open}
      value={value}
      items={items}
      setOpen={setOpen}
      setValue={setValue}
      placeholder={placeholder}
      style={[
        commonStyles.input,
        small && {
          height: 38,
          minHeight: 38,
          paddingVertical: 0,
          borderRadius: 16,
        },
      ]}
      listMode="MODAL"
      modalProps={{ animationType: "slide" }}
      modalContentContainerStyle={{
        backgroundColor: COLORS.background,
        paddingVertical: 50,
        paddingHorizontal: "10%",
        flex: 1,
      }}
      modalTitle={modalTitle}
      modalTitleStyle={{
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.text,
        textAlign: "center",
        marginBottom: 10,
      }}
      listItemContainerStyle={{
        borderBottomWidth: 1,
        paddingVertical: 10,
        borderBottomColor: COLORS.grayLight,
      }}
      scrollViewProps={{ nestedScrollEnabled: true }}
    />
  );
}
