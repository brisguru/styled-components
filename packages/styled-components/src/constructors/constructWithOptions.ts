import {
  Attrs,
  ExecutionContext,
  Interpolation,
  IStyledComponent,
  IStyledComponentFactory,
  KnownTarget,
  RuleSet,
  Runtime,
  StyledOptions,
  StyledTarget,
  Styles,
} from '../types';
import { EMPTY_OBJECT } from '../utils/empties';
import styledError from '../utils/error';
import css from './css';

export interface Styled<
  R extends Runtime,
  Target extends StyledTarget<R>,
  DerivedProps extends object = Target extends KnownTarget
    ? React.ComponentPropsWithRef<Target>
    : object,
  OuterProps extends object = object,
  OuterStatics extends object = object
> {
  <Props extends object = object, Statics extends object = object>(
    initialStyles: Styles<DerivedProps & OuterProps & Props>,
    ...interpolations: Interpolation<ExecutionContext & DerivedProps & OuterProps & Props>[]
  ): IStyledComponent<R, Target, DerivedProps & OuterProps & Props> & OuterStatics & Statics;

  attrs: <
    T extends Attrs<object> = object,
    Props extends object = T extends (...args: any) => object ? ReturnType<T> : T
  >(
    attrs: Attrs<DerivedProps & OuterProps & Props>
  ) => Styled<R, Target, DerivedProps, OuterProps & Partial<Props>, OuterStatics>;

  withConfig: (
    config: StyledOptions<R, DerivedProps & OuterProps>
  ) => Styled<R, Target, DerivedProps, OuterProps, OuterStatics>;
}

export default function constructWithOptions<
  R extends Runtime,
  Target extends StyledTarget<R>,
  DerivedProps extends object = Target extends KnownTarget
    ? React.ComponentPropsWithRef<Target>
    : object,
  OuterProps extends object = object, // used for styled<{}>().attrs() so attrs() gets the generic prop context
  OuterStatics extends object = object
>(
  componentConstructor: IStyledComponentFactory<R, Target, DerivedProps & OuterProps, OuterStatics>,
  tag: Target,
  options: StyledOptions<R, DerivedProps & OuterProps> = EMPTY_OBJECT
): Styled<R, Target, DerivedProps, OuterProps, OuterStatics> {
  // We trust that the tag is a valid component as long as it isn't falsish
  // Typically the tag here is a string or function (i.e. class or pure function component)
  // However a component may also be an object if it uses another utility, e.g. React.memo
  // React will output an appropriate warning however if the `tag` isn't valid
  if (!tag) {
    throw styledError(1, tag);
  }

  /* This is callable directly as a template function */
  const templateFunction = <Props extends object = object, Statics extends object = object>(
    initialStyles: Styles<DerivedProps & OuterProps & Props>,
    ...interpolations: Interpolation<ExecutionContext & DerivedProps & OuterProps & Props>[]
  ) =>
    componentConstructor<Props, Statics>(
      tag,
      options,
      css(initialStyles, ...interpolations) as RuleSet<DerivedProps & OuterProps & Props>
    );

  /* Modify/inject new props at runtime */
  templateFunction.attrs = <
    T extends Attrs<object> = object,
    Props extends object = T extends (...args: any) => object ? ReturnType<T> : T
  >(
    attrs: Attrs<DerivedProps & OuterProps & Props>
  ) =>
    constructWithOptions<R, Target, DerivedProps, OuterProps & Partial<Props>, OuterStatics>(
      componentConstructor,
      tag,
      {
        ...options,
        attrs: Array.prototype.concat(options.attrs, attrs).filter(Boolean),
      }
    );

  /**
   * If config methods are called, wrap up a new template function and merge options */
  templateFunction.withConfig = (config: StyledOptions<R, DerivedProps & OuterProps>) =>
    constructWithOptions<R, Target, DerivedProps, OuterProps, OuterStatics>(
      componentConstructor,
      tag,
      {
        ...options,
        ...config,
      }
    );

  return templateFunction;
}
