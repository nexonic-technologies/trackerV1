import { useState, useEffect } from 'react';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/authProvider';

export const useUserProfile = () => {
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState(null);
  const [roleName, setRoleName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) {
        // console.log('No user ID available');
        setLoading(false);
        return;
      }

      try {
        const populateFields = {
          'professionalInfo.role': 'name'
        };

        const response = await axiosInstance.post(`/populate/read/employees/${user.id}`, {
          populateFields
        });
        const employee = response.data.data;

        // Set profile image
        if (employee?.basicInfo?.profileImage) {
          setProfileImage(employee.basicInfo.profileImage);
        }

        // Set role name
        if (employee?.professionalInfo?.role?.name) {
          setRoleName(employee.professionalInfo.role.name);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user?.id]);

  return { profileImage, roleName, loading };
};