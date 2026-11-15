import React, { useState } from 'react';
import { ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  VStack,
  Text,
  Heading,
  Button,
  ButtonText,
  Badge,
  BadgeText,
  Card,
  Input,
  InputField,
} from '@timmbr/native-ui';
import { loginSchema, type LoginFormData } from '@/features/auth/schemas/login.schema';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { authStrings } from '@/strings/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { invited } = useLocalSearchParams<{ invited?: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const signIn = useAuthStore((state) => state.signIn);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setApiErrorMessage(null);
    try {
      await signIn(data);
    } catch (err: unknown) {
      const isForbidden =
        typeof err === 'object' && err !== null && 'statusCode' in err && err.statusCode === 403;
      const message = isForbidden
        ? authStrings.validation.staffAccessRequired
        : err instanceof Error
          ? err.message
          : 'Invalid credentials. Please try again.';
      setApiErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="p-6 justify-center min-h-full"
          keyboardShouldPersistTaps="handled"
        >
          <VStack space="lg" className="max-w-md w-full mx-auto">
            <VStack space="sm" className="items-center text-center">
              <Badge variant="solid" action="primary">
                <BadgeText>{authStrings.header.badge}</BadgeText>
              </Badge>
              <Heading size="2xl" className="text-center mt-2 font-serif text-primary">
                {authStrings.header.brand}
              </Heading>
              <Heading size="lg" className="text-center font-title text-foreground">
                {authStrings.header.title}
              </Heading>
              <Text className="text-center text-sm text-muted-foreground mt-1 px-2">
                {authStrings.header.subtitle}
              </Text>
            </VStack>

            <Card className="bg-secondary/40 border-primary/20">
              <VStack space="xs">
                <Text className="font-semibold text-xs text-primary font-sans uppercase tracking-wider">
                  {authStrings.banner.title}
                </Text>
                <Text className="text-xs text-secondary-foreground leading-relaxed">
                  {authStrings.banner.description}
                </Text>
              </VStack>
            </Card>

            {invited === '1' && (
              <Card className="bg-primary/10 border-primary/40">
                <VStack space="xs">
                  <Text className="font-bold text-xs text-primary">
                    {authStrings.invitedBanner.title}
                  </Text>
                  <Text className="text-xs text-foreground leading-relaxed">
                    {authStrings.invitedBanner.description}
                  </Text>
                </VStack>
              </Card>
            )}

            {apiErrorMessage && (
              <Card className="bg-destructive/10 border-destructive">
                <VStack space="xs">
                  <Text className="font-bold text-xs text-destructive">
                    {authStrings.form.errorTitle}
                  </Text>
                  <Text className="text-xs text-destructive leading-relaxed">
                    {apiErrorMessage}
                  </Text>
                </VStack>
              </Card>
            )}

            <VStack space="md" className="mt-2">
              <VStack space="xs">
                <Text className="text-xs font-semibold text-foreground">
                  {authStrings.form.identifierLabel}
                </Text>
                <Controller
                  control={control}
                  name="identifier"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input isInvalid={!!errors.identifier}>
                      <InputField
                        placeholder={authStrings.form.identifierPlaceholder}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        editable={!isSubmitting}
                      />
                    </Input>
                  )}
                />
                {errors.identifier && (
                  <Text className="text-xs text-destructive mt-0.5">
                    {errors.identifier.message}
                  </Text>
                )}
              </VStack>

              <VStack space="xs">
                <Text className="text-xs font-semibold text-foreground">
                  {authStrings.form.passwordLabel}
                </Text>
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input isInvalid={!!errors.password}>
                      <InputField
                        placeholder={authStrings.form.passwordPlaceholder}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        secureTextEntry
                        editable={!isSubmitting}
                      />
                    </Input>
                  )}
                />
                {errors.password && (
                  <Text className="text-xs text-destructive mt-0.5">{errors.password.message}</Text>
                )}
              </VStack>

              <Button
                action="primary"
                variant="solid"
                size="lg"
                className="mt-3"
                isLoading={isSubmitting}
                isDisabled={isSubmitting}
                onPress={() => void handleSubmit(onSubmit)()}
              >
                <ButtonText>
                  {isSubmitting ? authStrings.form.submittingButton : authStrings.form.submitButton}
                </ButtonText>
              </Button>

              <VStack space="xs" className="mt-2 items-center">
                <Text className="text-xs text-muted-foreground text-center">
                  {authStrings.form.invitePrompt}
                </Text>
                <Button
                  action="secondary"
                  variant="outline"
                  size="md"
                  className="w-full"
                  isDisabled={isSubmitting}
                  onPress={() => router.push('/(auth)/accept-invite')}
                >
                  <ButtonText>{authStrings.form.activateInviteButton}</ButtonText>
                </Button>
              </VStack>
            </VStack>

            <Box className="mt-6 pt-4 border-t border-border items-center">
              <Text className="text-xs text-muted-foreground text-center">
                {authStrings.footer.help}
              </Text>
            </Box>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
