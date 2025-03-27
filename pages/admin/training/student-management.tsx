import React, { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { prisma } from '../../../lib/prisma';
import AdminLayout from '../../../components/admin/AdminLayout';
import EnrollmentInterface from '../../../components/admin/training/EnrollmentInterface';
import StudentProgressDashboard from '../../../components/admin/training/StudentProgressDashboard';
import CourseCompletionReports from '../../../components/admin/training/CourseCompletionReports';
import { Tab } from '@headlessui/react';
import { 
  UserGroupIcon, 
  AcademicCapIcon, 
  DocumentChartBarIcon 
} from '@heroicons/react/24/outline';

interface Course {
  id: string;
  name: string;
}

interface StudentManagementProps {
  courses: Course[];
}

export default function StudentManagement({ courses }: StudentManagementProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  
  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  const tabs = [
    { name: 'Matrículas', icon: UserGroupIcon },
    { name: 'Progresso', icon: AcademicCapIcon },
    { name: 'Relatórios', icon: DocumentChartBarIcon }
  ];

  return (
    <AdminLayout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Gerenciamento de Alunos</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4">
            {/* Course selection */}
            <div className="mb-6">
              <label htmlFor="course-select" className="block text-sm font-medium text-gray-700">
                Selecione um curso
              </label>
              <select
                id="course-select"
                name="course"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="">Selecione um curso</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCourseId && (
              <Tab.Group>
                <Tab.List className="flex p-1 space-x-1 bg-gray-100 rounded-xl mb-6">
                  {tabs.map((tab) => (
                    <Tab
                      key={tab.name}
                      className={({ selected }) =>
                        `w-full py-2.5 text-sm leading-5 font-medium rounded-lg
                        ${
                          selected
                            ? 'bg-white text-primary-700 shadow'
                            : 'text-gray-700 hover:bg-white/[0.12] hover:text-primary-600'
                        }
                        flex items-center justify-center`
                      }
                    >
                      <tab.icon className="w-5 h-5 mr-2" />
                      {tab.name}
                    </Tab>
                  ))}
                </Tab.List>
                <Tab.Panels className="mt-2">
                  {/* Enrollment Interface */}
                  <Tab.Panel>
                    <EnrollmentInterface courseId={selectedCourseId} />
                  </Tab.Panel>
                  
                  {/* Student Progress Dashboard */}
                  <Tab.Panel>
                    <StudentProgressDashboard courseId={selectedCourseId} />
                  </Tab.Panel>
                  
                  {/* Course Completion Reports */}
                  <Tab.Panel>
                    <CourseCompletionReports courseId={selectedCourseId} />
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: '/auth/signin',
        permanent: false,
      },
    };
  }

  // Check if user is admin
  const user = await prisma.$queryRaw`
    SELECT u.id, u."companyId", r.name as role
    FROM "User" u
    JOIN "Role" r ON u."roleId" = r.id
    WHERE u.id = ${session.user.id}
  `;

  if (!Array.isArray(user) || user.length === 0 || user[0].role !== 'admin') {
    return {
      redirect: {
        destination: '/dashboard',
        permanent: false,
      },
    };
  }

  const companyId = user[0].companyId;

  // Get courses for this company
  const coursesData = await prisma.$queryRaw`
    SELECT id, name
    FROM "Course"
    WHERE "companyId" = ${companyId}
    ORDER BY name
  `;

  return {
    props: {
      courses: JSON.parse(JSON.stringify(coursesData)),
    },
  };
};
