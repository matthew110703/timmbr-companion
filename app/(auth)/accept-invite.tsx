import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Badge,
  BadgeText,
  Box,
  Button,
  ButtonText,
  Card,
  Heading,
  Input,
  InputField,
  Text,
  VStack,
} from '@timmbr/native-ui';
import { env, getDevMailpitUrl } from '@/config/env';
import { authApi } from '@/features/auth/api/auth.api';
import {
  acceptInviteSchema,
  type AcceptInviteFormData,
} from '@/features/auth/schemas/accept-invite.schema';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { extractInviteToken } from '@/features/auth/utils/invite-token';
import { authStrings } from '@/strings/auth';

type TokenStatus = 'manual' | 'validating' | 'valid' | 'invalid';

export default function AcceptInviteScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const authStatus = useAuthStore((state) => state.status);
  const signOut = useAuthStore((state) => state.signOut);

  const initialRouteToken = extractInviteToken(typeof token === 'string' ? token : '');
  const [activeToken, setActiveToken] = useState<string>(initialRouteToken);
  const [manualInput, setManualInput] = useState<string>('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(
    initialRouteToken ? 'validating' : 'manual',
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    const incomingToken = extractInviteToken(typeof token === 'string' ? token : '');
    if (incomingToken) {
      setActiveToken(incomingToken);
      setValidationAttempt((prev) => prev + 1);
    }
  }, [token]);

  useEffect(() => {
    if (!activeToken) {
      setTokenStatus('manual');
      return;
    }

    let cancelled = false;
    setTokenStatus('validating');

    authApi
      .validateInviteToken(activeToken)
      .then(() => {
        if (!cancelled) setTokenStatus('valid');
      })
      .catch(() => {
        if (!cancelled) setTokenStatus('invalid');
      });

    return () => {
      cancelled = true;
    };
  }, [activeToken, validationAttempt]);

  const handleManualVerify = () => {
    const extracted = extractInviteToken(manualInput);
    if (!extracted) {
      setManualError(authStrings.acceptInvite.manualTokenRequired);
      return;
    }
    setManualError(null);
    setActiveToken(extracted);
    setValidationAttempt((prev) => prev + 1);
  };

  const handleOpenManualEntry = () => {
    setManualError(null);
    setActiveToken('');
    setTokenStatus('manual');
  };

  const onSubmit = async (data: AcceptInviteFormData) => {
    if (!activeToken) return;
    setIsSubmitting(true);
    setApiErrorMessage(null);
    try {
      await authApi.acceptInvite(activeToken, data.password);
      // Force manual login so the invited staff member starts an isolated session.
      if (authStatus === 'authenticated') {
        await signOut();
      }
      router.replace('/(auth)/login?invited=1');
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to activate account. Your invite link may have expired.';
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
                <BadgeText>{authStrings.acceptInvite.badge}</BadgeText>
              </Badge>
              <Heading size="2xl" className="text-center mt-2 font-serif text-primary">
                {authStrings.header.brand}
              </Heading>
              <Heading size="lg" className="text-center font-title text-foreground">
                {authStrings.acceptInvite.title}
              </Heading>
              <Text className="text-center text-sm text-muted-foreground mt-1 px-2">
                {authStrings.acceptInvite.subtitle}
              </Text>
            </VStack>

            {tokenStatus === 'manual' && (
              <Card className="p-5">
                <VStack space="md">
                  <VStack space="xs">
                    <Text className="font-bold text-sm text-foreground">
                      {authStrings.acceptInvite.manualTitle}
                    </Text>
                    <Text className="text-xs text-muted-foreground leading-relaxed">
                      {authStrings.acceptInvite.manualDescription}
                    </Text>
                  </VStack>

                  <VStack space="xs">
                    <Text className="text-xs font-semibold text-foreground">
                      {authStrings.acceptInvite.manualInputLabel}
                    </Text>
                    <Input isInvalid={!!manualError}>
                      <InputField
                        placeholder={authStrings.acceptInvite.manualInputPlaceholder}
                        value={manualInput}
                        onChangeText={(text) => {
                          setManualInput(text);
                          if (manualError) setManualError(null);
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </Input>
                    {manualError && (
                      <Text className="text-xs text-destructive mt-0.5">{manualError}</Text>
                    )}
                  </VStack>

                  <Button action="primary" variant="solid" onPress={handleManualVerify}>
                    <ButtonText>{authStrings.acceptInvite.verifyButton}</ButtonText>
                  </Button>

                  {env.EXPO_PUBLIC_APP_ENV === 'development' && (
                    <Button
                      action="secondary"
                      variant="outline"
                      onPress={() => {
                        void Linking.openURL(getDevMailpitUrl());
                      }}
                    >
                      <ButtonText>{authStrings.acceptInvite.openMailpitButton}</ButtonText>
                    </Button>
                  )}

                  <Button
                    action="secondary"
                    variant="outline"
                    onPress={() => router.replace('/(auth)/login')}
                  >
                    <ButtonText>{authStrings.acceptInvite.backToLogin}</ButtonText>
                  </Button>
                </VStack>
              </Card>
            )}

            {tokenStatus === 'validating' && (
              <Card className="p-6 items-center">
                <VStack space="sm" className="items-center">
                  <ActivityIndicator size="large" color="#C0643A" />
                  <Text className="text-sm text-muted-foreground text-center">
                    {authStrings.acceptInvite.validating}
                  </Text>
                </VStack>
              </Card>
            )}

            {tokenStatus === 'invalid' && (
              <Card className="bg-destructive/10 border-destructive p-5">
                <VStack space="md">
                  <VStack space="xs">
                    <Text className="font-bold text-sm text-destructive">
                      {authStrings.acceptInvite.invalidTitle}
                    </Text>
                    <Text className="text-xs text-destructive leading-relaxed">
                      {authStrings.acceptInvite.invalidDescription}
                    </Text>
                  </VStack>
                  <Button action="primary" variant="solid" onPress={handleOpenManualEntry}>
                    <ButtonText>{authStrings.acceptInvite.enterTokenManually}</ButtonText>
                  </Button>
                  <Button
                    action="secondary"
                    variant="outline"
                    onPress={() => router.replace('/(auth)/login')}
                  >
                    <ButtonText>{authStrings.acceptInvite.backToLogin}</ButtonText>
                  </Button>
                </VStack>
              </Card>
            )}

            {tokenStatus === 'valid' && (
              <VStack space="md" className="mt-2">
                {apiErrorMessage && (
                  <Card className="bg-destructive/10 border-destructive">
                    <VStack space="xs">
                      <Text className="font-bold text-xs text-destructive">
                        {authStrings.acceptInvite.errorTitle}
                      </Text>
                      <Text className="text-xs text-destructive leading-relaxed">
                        {apiErrorMessage}
                      </Text>
                    </VStack>
                  </Card>
                )}

                <VStack space="xs">
                  <Text className="text-xs font-semibold text-foreground">
                    {authStrings.acceptInvite.passwordLabel}
                  </Text>
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input isInvalid={!!errors.password}>
                        <InputField
                          placeholder={authStrings.acceptInvite.passwordPlaceholder}
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
                    <Text className="text-xs text-destructive mt-0.5">
                      {errors.password.message}
                    </Text>
                  )}
                </VStack>

                <VStack space="xs">
                  <Text className="text-xs font-semibold text-foreground">
                    {authStrings.acceptInvite.confirmPasswordLabel}
                  </Text>
                  <Controller
                    control={control}
                    name="confirmPassword"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <Input isInvalid={!!errors.confirmPassword}>
                        <InputField
                          placeholder={authStrings.acceptInvite.confirmPasswordPlaceholder}
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          secureTextEntry
                          editable={!isSubmitting}
                        />
                      </Input>
                    )}
                  />
                  {errors.confirmPassword && (
                    <Text className="text-xs text-destructive mt-0.5">
                      {errors.confirmPassword.message}
                    </Text>
                  )}
                </VStack>

                <Text className="text-xs text-muted-foreground leading-relaxed">
                  {authStrings.acceptInvite.policyHint}
                </Text>

                <Button
                  action="primary"
                  variant="solid"
                  size="lg"
                  className="mt-2"
                  isLoading={isSubmitting}
                  isDisabled={isSubmitting}
                  onPress={() => void handleSubmit(onSubmit)()}
                >
                  <ButtonText>
                    {isSubmitting
                      ? authStrings.acceptInvite.submittingButton
                      : authStrings.acceptInvite.submitButton}
                  </ButtonText>
                </Button>
              </VStack>
            )}

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
