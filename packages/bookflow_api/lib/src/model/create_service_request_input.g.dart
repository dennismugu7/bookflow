// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'create_service_request_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$CreateServiceRequestInput extends CreateServiceRequestInput {
  @override
  final String name;
  @override
  final int durationMinutes;
  @override
  final int priceKes;
  @override
  final int? position;

  factory _$CreateServiceRequestInput(
          [void Function(CreateServiceRequestInputBuilder)? updates]) =>
      (CreateServiceRequestInputBuilder()..update(updates))._build();

  _$CreateServiceRequestInput._(
      {required this.name,
      required this.durationMinutes,
      required this.priceKes,
      this.position})
      : super._();
  @override
  CreateServiceRequestInput rebuild(
          void Function(CreateServiceRequestInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  CreateServiceRequestInputBuilder toBuilder() =>
      CreateServiceRequestInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is CreateServiceRequestInput &&
        name == other.name &&
        durationMinutes == other.durationMinutes &&
        priceKes == other.priceKes &&
        position == other.position;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, durationMinutes.hashCode);
    _$hash = $jc(_$hash, priceKes.hashCode);
    _$hash = $jc(_$hash, position.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'CreateServiceRequestInput')
          ..add('name', name)
          ..add('durationMinutes', durationMinutes)
          ..add('priceKes', priceKes)
          ..add('position', position))
        .toString();
  }
}

class CreateServiceRequestInputBuilder
    implements
        Builder<CreateServiceRequestInput, CreateServiceRequestInputBuilder> {
  _$CreateServiceRequestInput? _$v;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  int? _durationMinutes;
  int? get durationMinutes => _$this._durationMinutes;
  set durationMinutes(int? durationMinutes) =>
      _$this._durationMinutes = durationMinutes;

  int? _priceKes;
  int? get priceKes => _$this._priceKes;
  set priceKes(int? priceKes) => _$this._priceKes = priceKes;

  int? _position;
  int? get position => _$this._position;
  set position(int? position) => _$this._position = position;

  CreateServiceRequestInputBuilder() {
    CreateServiceRequestInput._defaults(this);
  }

  CreateServiceRequestInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _durationMinutes = $v.durationMinutes;
      _priceKes = $v.priceKes;
      _position = $v.position;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(CreateServiceRequestInput other) {
    _$v = other as _$CreateServiceRequestInput;
  }

  @override
  void update(void Function(CreateServiceRequestInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  CreateServiceRequestInput build() => _build();

  _$CreateServiceRequestInput _build() {
    final _$result = _$v ??
        _$CreateServiceRequestInput._(
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'CreateServiceRequestInput', 'name'),
          durationMinutes: BuiltValueNullFieldError.checkNotNull(
              durationMinutes, r'CreateServiceRequestInput', 'durationMinutes'),
          priceKes: BuiltValueNullFieldError.checkNotNull(
              priceKes, r'CreateServiceRequestInput', 'priceKes'),
          position: position,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
