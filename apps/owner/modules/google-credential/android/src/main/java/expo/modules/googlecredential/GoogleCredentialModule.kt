package expo.modules.googlecredential

import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.GetCredentialProviderConfigurationException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.security.MessageDigest
import java.security.SecureRandom

/**
 * Sign in with Google through Android Credential Manager (release 1.0.0 part 4): Google's own
 * chooser ("to continue to Bookflow") and, the first time, its consent, over the app with no extra
 * activity of ours. Returns Google's ID token; Supabase turns it into a session.
 */
class GoogleCredentialModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("GoogleCredential")

    // A fresh nonce per attempt: Google signs its SHA-256 into the token, Supabase gets the raw one.
    Function("createNonce") {
      val bytes = ByteArray(32).also { SecureRandom().nextBytes(it) }
      val raw = bytes.toHex()
      mapOf("raw" to raw, "hashed" to sha256Hex(raw))
    }

    Function("sha256Hex") { text: String -> sha256Hex(text) }

    AsyncFunction("signIn") Coroutine { serverClientId: String, hashedNonce: String ->
      val activity = appContext.currentActivity
        ?: throw CodedException("NO_ACTIVITY", "No activity to show Google's chooser on", null)
      val option = GetSignInWithGoogleOption.Builder(serverClientId).setNonce(hashedNonce).build()
      val request = GetCredentialRequest.Builder().addCredentialOption(option).build()
      try {
        val credential = CredentialManager.create(activity).getCredential(activity, request).credential
        if (credential is CustomCredential &&
          credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
          mapOf("idToken" to GoogleIdTokenCredential.createFrom(credential.data).idToken)
        } else {
          throw CodedException("UNEXPECTED_CREDENTIAL", "Not a Google ID token: ${credential.type}", null)
        }
      } catch (e: GetCredentialCancellationException) {
        throw CodedException("CANCELLED", e.message, e)
      } catch (e: NoCredentialException) {
        throw CodedException("NO_CREDENTIAL", e.message, e)
      } catch (e: GetCredentialProviderConfigurationException) {
        throw CodedException("NO_PROVIDER", e.message, e)
      } catch (e: GetCredentialException) {
        throw CodedException("CREDENTIAL_ERROR", "${e.type}: ${e.message}", e)
      }
    }

    // On Log out and after Delete account, so the next sign-in shows the chooser again.
    AsyncFunction("clearCredentialState") Coroutine { ->
      val context = appContext.reactContext
        ?: throw CodedException("NO_CONTEXT", "No context", null)
      CredentialManager.create(context).clearCredentialState(ClearCredentialStateRequest())
    }
  }

  private fun sha256Hex(text: String): String =
    MessageDigest.getInstance("SHA-256").digest(text.toByteArray(Charsets.UTF_8)).toHex()

  private fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it) }
}
