import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PageDto } from './page.dto';

/**
 * Cross-field rule: `activePageId` must reference the id of one of the project's
 * pages. Implemented as a class-validator constraint so it runs inside the
 * global ValidationPipe and reports through the standard validation envelope.
 */
@ValidatorConstraint({ name: 'activePageExists', async: false })
export class ActivePageExistsConstraint implements ValidatorConstraintInterface {
  validate(activePageId: unknown, args: ValidationArguments): boolean {
    const pages = (args.object as { pages?: PageDto[] }).pages;
    if (!Array.isArray(pages)) return false;
    return pages.some((page) => page?.id === activePageId);
  }

  defaultMessage(): string {
    return 'activePageId must reference the id of an existing page';
  }
}

export function IsActivePage(options?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      validator: ActivePageExistsConstraint,
    });
  };
}
