import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import {
  changePasswordSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from '@min-trello/shared';
import { KeyRoundIcon, UserIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { applyServerErrors } from '@/shared/lib/form-errors';
import { ruZodErrorMap } from '@/shared/lib/zod-error-map';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/shared/ui/form';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export function ProfilePage() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema, { errorMap: ruZodErrorMap }),
    defaultValues: { name: user?.name ?? '' },
  });

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema, { errorMap: ruZodErrorMap }),
    defaultValues: { oldPassword: '', newPassword: '' },
  });

  const currentName = user?.name ?? '';
  useEffect(() => {
    profileForm.reset({ name: currentName });
  }, [currentName, profileForm]);

  async function onSubmitProfile(values: UpdateProfileInput) {
    profileForm.clearErrors('root');
    setProfileNotice(null);
    try {
      await updateProfile(values);
      profileForm.reset(values);
      setProfileNotice('Имя сохранено.');
    } catch (error) {
      applyServerErrors(profileForm.setError, error);
    }
  }

  async function onSubmitPassword(values: ChangePasswordInput) {
    passwordForm.clearErrors('root');
    try {
      await changePassword(values);
      // Changing the password revokes every refresh token: force a fresh login.
      await logout();
      navigate('/login', {
        replace: true,
        state: { notice: 'Пароль изменён. Войдите с новым паролем.' },
      });
    } catch (error) {
      applyServerErrors(passwordForm.setError, error);
    }
  }

  const savingProfile = profileForm.formState.isSubmitting;
  const savingPassword = passwordForm.formState.isSubmitting;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Профиль</h1>
        <p className="text-sm text-muted-foreground">Управляйте именем и паролем аккаунта.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="size-5" />
            Имя
          </CardTitle>
          <CardDescription>Отображается в хедере и в исполнителях карточек.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form
              className="grid gap-4"
              onSubmit={profileForm.handleSubmit(onSubmitProfile)}
              noValidate
            >
              <div className="grid gap-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={user?.email ?? ''}
                  disabled
                  readOnly
                />
              </div>
              <FormField
                control={profileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя</FormLabel>
                    <FormControl>
                      <Input type="text" autoComplete="name" placeholder="Alice" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {profileForm.formState.errors.root ? (
                <p role="alert" className="text-sm text-destructive">
                  {profileForm.formState.errors.root.message}
                </p>
              ) : null}
              {profileNotice ? (
                <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
                  {profileNotice}
                </p>
              ) : null}
              <Button type="submit" className="justify-self-start" disabled={savingProfile}>
                {savingProfile ? 'Сохраняем…' : 'Сохранить имя'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRoundIcon className="size-5" />
            Смена пароля
          </CardTitle>
          <CardDescription>После смены пароля потребуется войти заново.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form
              className="grid gap-4"
              onSubmit={passwordForm.handleSubmit(onSubmitPassword)}
              noValidate
            >
              <FormField
                control={passwordForm.control}
                name="oldPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Текущий пароль</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Новый пароль</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {passwordForm.formState.errors.root ? (
                <p role="alert" className="text-sm text-destructive">
                  {passwordForm.formState.errors.root.message}
                </p>
              ) : null}
              <Button type="submit" className="justify-self-start" disabled={savingPassword}>
                {savingPassword ? 'Меняем…' : 'Сменить пароль'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
