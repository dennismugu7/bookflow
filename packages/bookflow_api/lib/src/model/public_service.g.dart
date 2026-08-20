// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'public_service.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PublicService extends PublicService {
  @override
  final String id;
  @override
  final String name;
  @override
  final int durationMinutes;
  @override
  final int priceKes;

  factory _$PublicService([void Function(PublicServiceBuilder)? updates]) =>
      (PublicServiceBuilder()..update(updates))._build();

  _$PublicService._(
      {required this.id,
      required this.name,
      required this.durationMinutes,
      required this.priceKes})
      : super._();
  @override
  PublicService rebuild(void Function(PublicServiceBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PublicServiceBuilder toBuilder() => PublicServiceBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PublicService &&
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
    return (newBuiltValueToStringHelper(r'PublicService')
          ..add('id', id)
          ..add('name', name)
          ..add('durationMinutes', durationMinutes)
          ..add('priceKes', priceKes))
        .toString();
  }
}

class PublicServiceBuilder
    implements Builder<PublicService, PublicServiceBuilder> {
  _$PublicService? _$v;

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

  PublicServiceBuilder() {
    PublicService._defaults(this);
  }

  PublicServiceBuilder get _$this {
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
  void replace(PublicService other) {
    _$v = other as _$PublicService;
  }

  @override
  void update(void Function(PublicServiceBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PublicService build() => _build();

  _$PublicService _build() {
    final _$result = _$v ??
        _$PublicService._(
          id: BuiltValueNullFieldError.checkNotNull(id, r'PublicService', 'id'),
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'PublicService', 'name'),
          durationMinutes: BuiltValueNullFieldError.checkNotNull(
              durationMinutes, r'PublicService', 'durationMinutes'),
          priceKes: BuiltValueNullFieldError.checkNotNull(
              priceKes, r'PublicService', 'priceKes'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
