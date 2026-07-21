import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Search } from 'lucide-react-native';
import { colors, radius, spacing, touchTarget } from '../../theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search by Vehicle No. or Transporter...',
}) => {
  return (
    <View style={styles.container}>
      <Search size={20} color={colors.text.muted} style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.surface,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    height: touchTarget,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  icon: {
    marginRight: spacing.sm + 2,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: colors.text.primary,
  },
});
