import React, {useEffect, useState, useContext, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {AuthContext} from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import axios from 'axios';
import fonts from '../theme/fonts';

export default function Profile() {
  const {user} = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const { showAlert } = useAlert();

  useEffect(() => {
    if (user?.id) {
      fetchUserDetails();
    }
  }, [user?.id, fetchUserDetails]);

  const fetchUserDetails = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `https://food.siliconsoft.pk/api/userdetails/${user.id}`,
      );
      console.log('res', res);
      const data = res?.data?.data[0];
      console.log('data');
      if (data) {
        setFormData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
        });
      }
    } catch {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to load profile.',
        confirmText: 'Close',
      });
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  const handleProfileChange = (key, val) => {
    setFormData({...formData, [key]: val});
  };

  const handlePasswordChange = (key, val) => {
    setPasswordData({...passwordData, [key]: val});
  };

  const updateProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.post(
        'https://food.siliconsoft.pk/api/updateuserprofile',
        {
          userid: user.id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          address: formData.address,
        },
      );
      if (res.status === 200) {
        showAlert({
          type: 'success',
          title: 'Success',
          message: 'Profile updated successfully.',
          confirmText: 'OK',
        });
      }
    } catch {
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to update profile.',
        confirmText: 'Close',
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    const {current_password, password, password_confirmation} = passwordData;

    if (!current_password || !password || !password_confirmation) {
      return showAlert({
        type: 'warning',
        title: 'Error',
        message: 'All password fields are required.',
        confirmText: 'OK',
      });
    }

    if (password !== password_confirmation) {
      return showAlert({
        type: 'warning',
        title: 'Error',
        message: 'Passwords do not match.',
        confirmText: 'OK',
      });
    }

    try {
      setLoading(true);
      const res = await axios.post(
        'https://food.siliconsoft.pk/api/updateusepassword',
        {
          userid: user.id,
          current_password,
          password,
          password_confirmation,
        },
      );
      if (res.status === 200) {
        showAlert({
          type: 'success',
          title: 'Success',
          message: 'Password updated.',
          confirmText: 'OK',
        });

        setPasswordData({
          current_password: '',
          password: '',
          password_confirmation: '',
        });
      }
    } catch (err) {
      showAlert({
        type: 'error',
        title: 'Failed',
        message: err?.response?.data?.message || 'Could not update password.',
        confirmText: 'Close',
      });
    } finally {
      setLoading(false);
    }
  };

  // Return JSX
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Image
          source={{
            uri:
              formData.avatar ||
              'https://www.w3schools.com/howto/img_avatar.png',
          }}
          style={styles.avatar}
        />
        <Text style={styles.name}>
          {formData.first_name} {formData.last_name}
        </Text>
        <Text style={styles.email}>{formData.email}</Text>
      </View>

      {loading && (
        <ActivityIndicator
          size="large"
          color="#33A744"
          style={styles.loading}
        />
      )}

      <View style={styles.section}>
        <TextInput
          style={styles.input}
          placeholder="Nombre"
          placeholderTextColor="rgba(47,47,47,0.6)"
          value={formData.first_name}
          onChangeText={text => handleProfileChange('first_name', text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Apellido"
          placeholderTextColor="rgba(47,47,47,0.6)"
          value={formData.last_name}
          onChangeText={text => handleProfileChange('last_name', text)}
        />
        <TextInput
          style={[styles.input, styles.disabledInput]}
          editable={false}
          placeholder="Correo electrónico"
          value={formData.email}
        />
        <TextInput
          style={styles.input}
          placeholder="Teléfono"
          placeholderTextColor="rgba(47,47,47,0.6)"
          keyboardType="phone-pad"
          value={formData.phone}
          onChangeText={text => handleProfileChange('phone', text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Dirección"
          placeholderTextColor="rgba(47,47,47,0.6)"
          value={formData.address}
          onChangeText={text => handleProfileChange('address', text)}
        />

        <TouchableOpacity style={styles.button} onPress={updateProfile}>
          <Text style={styles.buttonText}>Actualizar perfil</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, {marginTop: 24}]}>
        <Text style={styles.sectionTitle}>Cambiar contraseña</Text>

        <TextInput
          style={styles.input}
          placeholder="Contraseña actual"
          placeholderTextColor="rgba(47,47,47,0.6)"
          secureTextEntry
          value={passwordData.current_password}
          onChangeText={text => handlePasswordChange('current_password', text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Nueva contraseña"
          placeholderTextColor="rgba(47,47,47,0.6)"
          secureTextEntry
          value={passwordData.password}
          onChangeText={text => handlePasswordChange('password', text)}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirmar contraseña"
          placeholderTextColor="rgba(47,47,47,0.6)"
          secureTextEntry
          value={passwordData.password_confirmation}
          onChangeText={text =>
            handlePasswordChange('password_confirmation', text)
          }
        />

        <TouchableOpacity style={styles.button} onPress={updatePassword}>
          <Text style={styles.buttonText}>Cambiar contraseña</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2EFE4', // Crema Suave
  },
  scrollContent: {
    padding: 16, // escala 16px
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24, // escala 24px
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.large,
    color: '#2F2F2F', // Gris Carbón
    marginBottom: 4,
  },
  email: {
    fontFamily: fonts.regular,
    fontSize: fonts.size.small,
    color: 'rgba(47,47,47,0.6)',
  },
  loading: {
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
    elevation: 2,
  },
  disabledInput: {
    backgroundColor: '#EEE',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#33A744', // Verde Bosque
    marginBottom: 12,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#8B5E3C', // Marrón Tierra
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    fontSize: fonts.size.medium,
    color: '#2F2F2F',
    backgroundColor: '#FFF',
  },
  button: {
    backgroundColor: '#D27F27', // Dorado Campo
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: fonts.size.medium,
    color: '#ffffff',
  },
});
