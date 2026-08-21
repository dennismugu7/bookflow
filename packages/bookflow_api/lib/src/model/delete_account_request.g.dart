// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'delete_account_request.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$DeleteAccountRequest extends DeleteAccountRequest {
  @override
  final String? reason;

  factory _$DeleteAccountRequest(
          [void Function(DeleteAccountRequestBuilder)? updates]) =>
      (DeleteAccountRequestBuilder()..update(updates))._build();

  _$DeleteAccountRequest._({this.reason}) : super._();
  @override
  DeleteAccountRequest rebuild(
          void Function(DeleteAccountRequestBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  DeleteAccountRequestBuilder toBuilder() =>
      DeleteAccountRequestBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is DeleteAccountRequest && reason == other.reason;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, reason.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'DeleteAccountRequest')
          ..add('reason', reason))
        .toString();
  }
}

class DeleteAccountRequestBuilder
    implements Builder<DeleteAccountRequest, DeleteAccountRequestBuilder> {
  _$DeleteAccountRequest? _$v;

  String? _reason;
  String? get reason => _$this._reason;
  set reason(String? reason) => _$this._reason = reason;

  DeleteAccountRequestBuilder() {
    DeleteAccountRequest._defaults(this);
  }

  DeleteAccountRequestBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _reason = $v.reason;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(DeleteAccountRequest other) {
    _$v = other as _$DeleteAccountRequest;
  }

  @override
  void update(void Function(DeleteAccountRequestBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  DeleteAccountRequest build() => _build();

  _$DeleteAccountRequest _build() {
    final _$result = _$v ??
        _$DeleteAccountRequest._(
          reason: reason,
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
