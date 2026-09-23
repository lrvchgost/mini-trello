import { z } from 'zod';

/** Russian messages for the client-side validation driven by shared zod schemas. */
export const ruZodErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return {
        message:
          issue.received === 'undefined' || issue.received === 'null'
            ? 'Обязательное поле'
            : 'Некорректное значение',
      };
    case z.ZodIssueCode.too_small:
      if (typeof ctx.data === 'string' && ctx.data.length === 0) {
        return { message: 'Обязательное поле' };
      }
      return {
        message:
          issue.type === 'string' && issue.minimum > 1
            ? `Минимум ${issue.minimum} символов`
            : 'Обязательное поле',
      };
    case z.ZodIssueCode.too_big:
      return { message: `Максимум ${issue.maximum} символов` };
    case z.ZodIssueCode.invalid_string:
      return { message: 'Некорректное значение' };
    case z.ZodIssueCode.invalid_enum_value:
      return { message: 'Недопустимое значение' };
    default:
      return { message: ctx.defaultError };
  }
};
