// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'public_service_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PublicServiceInput extends PublicServiceInput {
  @override
  final String id;
  @override
  final String name;
  @override
  final int durationMinutes;
  @override
  final int priceKes;

  factory _$PublicServiceInput(
          [void Function(PublicServiceInputBuilder)? updates]) =>
      (PublicServiceInputBuilder()..update(updates))._build();

  _$PublicServiceInput._(
      {required this.id,
      required this.name,
      required this.durationMinutes,
      required this.priceKes})
      : super._();
  @override
  PublicServiceInput rebuild(
          void Function(PublicServiceInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PublicServiceInputBuilder toBuilder() =>
      PublicServiceInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PublicServiceInput &&
        id == other.id &&
        name == other.name &&
        durationMinutes == other.durationMinutes &&
        priceKes == other.priceKes;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, durationMinutes.hashCode);
    _$hash = $jc(_$hash, priceKes.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PublicServiceInput')
          ..add('id', id)
          ..add('name', name)
          ..add('durationMinutes', durationMinutes)
          ..add('priceKes', priceKes))
        .toString();
  }
}

class PublicServiceInputBuilder
    implements Builder<PublicServiceInput, PublicServiceInputBuilder> {
  _$PublicServiceInput? _$v;

  String? _id;
  String? get id => _$this._id;
  set id(String? id) => _$this._id = id;

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

  PublicServiceInputBuilder() {
    PublicServiceInput._defaults(this);
  }

  PublicServiceInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _name = $v.name;
      _durationMinutes = $v.durationMinutes;
      _priceKes = $v.priceKes;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PublicServiceInput other) {
    _$v = other as _$PublicServiceInput;
  }

  @override
  void update(void Function(PublicServiceInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PublicServiceInput build() => _build();

  _$PublicServiceInput _build() {
    final _$result = _$v ??
        _$PublicServiceInput._(
          id: BuiltValueNullFieldError.checkNotNull(
              id, r'PublicServiceInput', 'id'),
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'PublicServiceInput', 'name'),
          durationMinutes: BuiltValueNullFieldError.checkNotNull(
              durationMinutes, r'PublicServiceInput', 'durationMinutes'),
          priceKes: BuiltValueNullFieldError.checkNotNull(
              priceKes, r'PublicServiceInput', 'priceKes'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
