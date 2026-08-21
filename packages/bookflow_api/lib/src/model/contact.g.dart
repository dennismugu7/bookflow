// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'contact.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$Contact extends Contact {
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

  factory _$Contact([void Function(ContactBuilder)? updates]) =>
      (ContactBuilder()..update(updates))._build();

  _$Contact._(
      {required this.name,
      required this.email,
      required this.phone,
      required this.bookingCount,
      required this.lastBookingAt})
      : super._();
  @override
  Contact rebuild(void Function(ContactBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  ContactBuilder toBuilder() => ContactBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is Contact &&
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
    return (newBuiltValueToStringHelper(r'Contact')
          ..add('name', name)
          ..add('email', email)
          ..add('phone', phone)
          ..add('bookingCount', bookingCount)
          ..add('lastBookingAt', lastBookingAt))
        .toString();
  }
}

class ContactBuilder implements Builder<Contact, ContactBuilder> {
  _$Contact? _$v;

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

  ContactBuilder() {
    Contact._defaults(this);
  }

  ContactBuilder get _$this {
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
  void replace(Contact other) {
    _$v = other as _$Contact;
  }

  @override
  void update(void Function(ContactBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  Contact build() => _build();

  _$Contact _build() {
    final _$result = _$v ??
        _$Contact._(
          name: BuiltValueNullFieldError.checkNotNull(name, r'Contact', 'name'),
          email:
              BuiltValueNullFieldError.checkNotNull(email, r'Contact', 'email'),
          phone:
              BuiltValueNullFieldError.checkNotNull(phone, r'Contact', 'phone'),
          bookingCount: BuiltValueNullFieldError.checkNotNull(
              bookingCount, r'Contact', 'bookingCount'),
          lastBookingAt: BuiltValueNullFieldError.checkNotNull(
              lastBookingAt, r'Contact', 'lastBookingAt'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
