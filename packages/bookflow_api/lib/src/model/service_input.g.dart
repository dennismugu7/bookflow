// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'service_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ServiceInput extends ServiceInput {
  @override
  final String id;
  @override
  final String name;
  @override
  final int durationMinutes;
  @override
  final int priceKes;
  @override
  final int position;

  factory _$ServiceInput([void Function(ServiceInputBuilder)? updates]) =>
      (ServiceInputBuilder()..update(updates))._build();

  _$ServiceInput._(
      {required this.id,
      required this.name,
      required this.durationMinutes,
      required this.priceKes,
      required this.position})
      : super._();
  @override
  ServiceInput rebuild(void Function(ServiceInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ServiceInputBuilder toBuilder() => ServiceInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ServiceInput &&
        id == other.id &&
        name == other.name &&
        durationMinutes == other.durationMinutes &&
        priceKes == other.priceKes &&
        position == other.position;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, id.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, durationMinutes.hashCode);
    _$hash = $jc(_$hash, priceKes.hashCode);
    _$hash = $jc(_$hash, position.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ServiceInput')
          ..add('id', id)
          ..add('name', name)
          ..add('durationMinutes', durationMinutes)
          ..add('priceKes', priceKes)
          ..add('position', position))
        .toString();
  }
}

class ServiceInputBuilder
    implements Builder<ServiceInput, ServiceInputBuilder> {
  _$ServiceInput? _$v;

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

  int? _position;
  int? get position => _$this._position;
  set position(int? position) => _$this._position = position;

  ServiceInputBuilder() {
    ServiceInput._defaults(this);
  }

  ServiceInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _id = $v.id;
      _name = $v.name;
      _durationMinutes = $v.durationMinutes;
      _priceKes = $v.priceKes;
      _position = $v.position;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ServiceInput other) {
    _$v = other as _$ServiceInput;
  }

  @override
  void update(void Function(ServiceInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ServiceInput build() => _build();

  _$ServiceInput _build() {
    final _$result = _$v ??
        _$ServiceInput._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'ServiceInput', 'id'),
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'ServiceInput', 'name'),
          durationMinutes: BuiltValueNullFieldError.checkNotNull(
              durationMinutes, r'ServiceInput', 'durationMinutes'),
          priceKes: BuiltValueNullFieldError.checkNotNull(
              priceKes, r'ServiceInput', 'priceKes'),
          position: BuiltValueNullFieldError.checkNotNull(
              position, r'ServiceInput', 'position'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
