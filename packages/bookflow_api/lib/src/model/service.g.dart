// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'service.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Service extends Service {
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

  factory _$Service([void Function(ServiceBuilder)? updates]) =>
      (ServiceBuilder()..update(updates))._build();

  _$Service._(
      {required this.id,
      required this.name,
      required this.durationMinutes,
      required this.priceKes,
      required this.position})
      : super._();
  @override
  Service rebuild(void Function(ServiceBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ServiceBuilder toBuilder() => ServiceBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Service &&
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
    return (newBuiltValueToStringHelper(r'Service')
          ..add('id', id)
          ..add('name', name)
          ..add('durationMinutes', durationMinutes)
          ..add('priceKes', priceKes)
          ..add('position', position))
        .toString();
  }
}

class ServiceBuilder implements Builder<Service, ServiceBuilder> {
  _$Service? _$v;

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

  ServiceBuilder() {
    Service._defaults(this);
  }

  ServiceBuilder get _$this {
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
  void replace(Service other) {
    _$v = other as _$Service;
  }

  @override
  void update(void Function(ServiceBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Service build() => _build();

  _$Service _build() {
    final _$result = _$v ??
        _$Service._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'Service', 'id'),
          name: BuiltValueNullFieldError.checkNotNull(name, r'Service', 'name'),
          durationMinutes: BuiltValueNullFieldError.checkNotNull(
              durationMinutes, r'Service', 'durationMinutes'),
          priceKes: BuiltValueNullFieldError.checkNotNull(
              priceKes, r'Service', 'priceKes'),
          position: BuiltValueNullFieldError.checkNotNull(
              position, r'Service', 'position'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
