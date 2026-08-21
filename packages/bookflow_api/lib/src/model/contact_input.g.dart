// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'contact_input.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$ContactInput extends ContactInput {
  @override
  final String name;
  @override
  final String email;
  @override
  final String phone;
  @override
  final int bookingCount;
  @override
  final String lastBookingAt;

  factory _$ContactInput([void Function(ContactInputBuilder)? updates]) =>
      (ContactInputBuilder()..update(updates))._build();

  _$ContactInput._(
      {required this.name,
      required this.email,
      required this.phone,
      required this.bookingCount,
      required this.lastBookingAt})
      : super._();
  @override
  ContactInput rebuild(void Function(ContactInputBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ContactInputBuilder toBuilder() => ContactInputBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is ContactInput &&
        name == other.name &&
        email == other.email &&
        phone == other.phone &&
        bookingCount == other.bookingCount &&
        lastBookingAt == other.lastBookingAt;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, email.hashCode);
    _$hash = $jc(_$hash, phone.hashCode);
    _$hash = $jc(_$hash, bookingCount.hashCode);
    _$hash = $jc(_$hash, lastBookingAt.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'ContactInput')
          ..add('name', name)
          ..add('email', email)
          ..add('phone', phone)
          ..add('bookingCount', bookingCount)
          ..add('lastBookingAt', lastBookingAt))
        .toString();
  }
}

class ContactInputBuilder
    implements Builder<ContactInput, ContactInputBuilder> {
  _$ContactInput? _$v;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  String? _email;
  String? get email => _$this._email;
  set email(String? email) => _$this._email = email;

  String? _phone;
  String? get phone => _$this._phone;
  set phone(String? phone) => _$this._phone = phone;

  int? _bookingCount;
  int? get bookingCount => _$this._bookingCount;
  set bookingCount(int? bookingCount) => _$this._bookingCount = bookingCount;

  String? _lastBookingAt;
  String? get lastBookingAt => _$this._lastBookingAt;
  set lastBookingAt(String? lastBookingAt) =>
      _$this._lastBookingAt = lastBookingAt;

  ContactInputBuilder() {
    ContactInput._defaults(this);
  }

  ContactInputBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _name = $v.name;
      _email = $v.email;
      _phone = $v.phone;
      _bookingCount = $v.bookingCount;
      _lastBookingAt = $v.lastBookingAt;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(ContactInput other) {
    _$v = other as _$ContactInput;
  }

  @override
  void update(void Function(ContactInputBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  ContactInput build() => _build();

  _$ContactInput _build() {
    final _$result = _$v ??
        _$ContactInput._(
          name: BuiltValueNullFieldError.checkNotNull(
              name, r'ContactInput', 'name'),
          email: BuiltValueNullFieldError.checkNotNull(
              email, r'ContactInput', 'email'),
          phone: BuiltValueNullFieldError.checkNotNull(
              phone, r'ContactInput', 'phone'),
          bookingCount: BuiltValueNullFieldError.checkNotNull(
              bookingCount, r'ContactInput', 'bookingCount'),
          lastBookingAt: BuiltValueNullFieldError.checkNotNull(
              lastBookingAt, r'ContactInput', 'lastBookingAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
